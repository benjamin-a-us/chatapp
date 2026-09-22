<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Events\TypingUpdated;
use App\Events\UserPresenceChanged;
use App\Models\Message;
use App\Models\User;
use App\Notifications\LoginVerificationCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;

class ChatController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::defaults()],
        ]);

        $user = User::create([...$data, 'last_seen_at' => now()]);
        broadcast(new UserPresenceChanged($user, true));
        $token = $user->createToken('chat-house')->plainTextToken;

        return response()->json(['user' => $user, 'token' => $token], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $email = strtolower(trim($data['email']));
        $loginKey = 'login:' . $email . '|' . $request->ip();
        $user = User::where('email', $email)->first();

        if ($user?->suspended_at) return response()->json(['message' => 'This account has been permanently suspended.'], 403);

        if ($user?->locked_until?->isPast()) {
            $user->update(['failed_login_attempts' => 0, 'locked_until' => null]);
            RateLimiter::clear($loginKey);
        }
        if (RateLimiter::tooManyAttempts($loginKey, 5)) return response()->json(['message' => 'Too many attempts. Try again in 5 minutes.', 'retry_after' => RateLimiter::availableIn($loginKey)], 429);

        if ($user?->locked_until?->isFuture()) return response()->json(['message' => 'Too many attempts. Try again in 5 minutes.', 'locked_until' => $user->locked_until], 429);
        if (!$user || !Hash::check($data['password'], $user->password)) {
            if ($user) {
                $attempts = $user->failed_login_attempts + 1;
                $user->update(['failed_login_attempts' => $attempts, 'locked_until' => $attempts >= 5 ? now()->addMinutes(5) : null]);
            }
            $attempts = RateLimiter::hit($loginKey, 300);
            if ($attempts >= 5) return response()->json(['message' => 'Too many attempts. Try again in 5 minutes.', 'retry_after' => RateLimiter::availableIn($loginKey), 'locked_until' => $user?->fresh()->locked_until], 429);
            return response()->json(['message' => 'The email or password is incorrect.'], 422);
        }

        RateLimiter::clear($loginKey);
        if ($user->failed_login_attempts >= 3) {
            $code = (string) random_int(100000, 999999);
            $user->update(['login_code_hash' => Hash::make($code), 'login_code_expires_at' => now()->addMinutes(10), 'failed_login_attempts' => 0]);
            $user->notify(new LoginVerificationCode($code));
            return response()->json(['verification_required' => true, 'email' => $user->email], 202);
        }
        $user->update(['last_seen_at' => now()]);
        broadcast(new UserPresenceChanged($user, true));
        return response()->json(['user' => $user, 'token' => $user->createToken('chat-house')->plainTextToken]);
    }

    public function verifyLogin(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'code' => ['required', 'digits:6']]);
        $user = User::where('email', strtolower(trim($data['email'])))->first();
        if (!$user || !$user->login_code_expires_at?->isFuture() || !Hash::check($data['code'], $user->login_code_hash)) return response()->json(['message' => 'The verification code is invalid or expired.'], 422);
        $user->update(['login_code_hash' => null, 'login_code_expires_at' => null, 'last_seen_at' => now()]);
        return response()->json(['user' => $user, 'token' => $user->createToken('chat-house')->plainTextToken]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $status = PasswordBroker::sendResetLink(['email' => strtolower(trim($data['email']))]);
        return response()->json(['message' => __($status)]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'], 'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);
        $status = PasswordBroker::reset($data, function (User $user, string $password): void {
            $user->forceFill(['password' => $password, 'failed_login_attempts' => 0, 'locked_until' => null])->save();
        });
        return $status === PasswordBroker::PASSWORD_RESET ? response()->json(['message' => __($status)]) : response()->json(['message' => __($status)], 422);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->update(['last_seen_at' => null]);
        broadcast(new UserPresenceChanged($request->user(), false));
        $request->user()->currentAccessToken()?->delete();
        return response()->json(['message' => 'Signed out.']);
    }

    public function users(Request $request): JsonResponse
    {
        return response()->json(User::query()->whereKeyNot($request->user()->id)->where('last_seen_at', '>=', now()->subSeconds(30))->latest('last_seen_at')->get(['id', 'name', 'email', 'bio', 'headline', 'created_at', 'updated_at']));
    }

    public function publicProfile(Request $request, User $user): JsonResponse
    {
        return response()->json($user->only(['id', 'name', 'email', 'bio', 'headline', 'gender', 'phone', 'date_of_birth', 'education', 'work_experience', 'created_at']));
    }

    public function heartbeat(Request $request): JsonResponse
    {
        $request->user()->update(['last_seen_at' => now()]);
        broadcast(new UserPresenceChanged($request->user(), true));
        return response()->json(['ok' => true]);
    }

    public function profile(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['sometimes', 'required', 'string', 'max:80'], 'headline' => ['nullable', 'string', 'max:160'], 'bio' => ['nullable', 'string', 'max:500'], 'gender' => ['nullable', 'string', 'max:80'], 'phone' => ['nullable', 'string', 'max:40'], 'date_of_birth' => ['nullable', 'date'], 'education' => ['nullable', 'string', 'max:2000'], 'work_experience' => ['nullable', 'string', 'max:4000']]);
        $request->user()->update($data);
        return response()->json($request->user()->fresh());
    }

    public function messages(Request $request, User $user): JsonResponse
    {
        $current = $request->user();
        $messages = Message::query()
            ->where(fn ($query) => $query->where('sender_id', $current->id)->where('recipient_id', $user->id))
            ->orWhere(fn ($query) => $query->where('sender_id', $user->id)->where('recipient_id', $current->id))
            ->oldest()
            ->get();

        return response()->json($messages);
    }

    public function sendMessage(Request $request, User $user): JsonResponse
    {
        $sender = $request->user();
        if ($sender->suspended_at) return response()->json(['message' => 'This account has been permanently suspended.'], 403);
        $data = $request->validate(['body' => ['nullable', 'string', 'max:5000'], 'attachment' => ['nullable', 'file', 'max:102400']]);
        $distinctRecipients = Message::query()->where('sender_id', $sender->id)->where('created_at', '>=', now()->subMinutes(5))->distinct()->pluck('recipient_id');
        if (!$distinctRecipients->contains($user->id) && $distinctRecipients->count() >= 5) {
            $sender->update(['suspended_at' => now()]);
            $sender->tokens()->delete();
            return response()->json(['message' => 'Your account has been permanently suspended for mass messaging.'], 403);
        }
        if (blank($data['body'] ?? null) && !$request->hasFile('attachment')) return response()->json(['message' => 'A message or attachment is required.'], 422);
        $messageData = ['sender_id' => $sender->id, 'recipient_id' => $user->id, 'body' => $data['body'] ?? ''];
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $messageData += ['attachment_path' => $file->store('chat-attachments', 'public'), 'attachment_name' => $file->getClientOriginalName(), 'attachment_mime' => $file->getMimeType(), 'attachment_size' => $file->getSize()];
        }
        $message = Message::create($messageData);
        broadcast(new MessageSent($message->load('sender')))->toOthers();

        return response()->json($message->load('sender'), 201);
    }

    public function typing(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['is_typing' => ['required', 'boolean']]);
        broadcast(new TypingUpdated($request->user(), $user->id, $data['is_typing']))->toOthers();
        return response()->json(['ok' => true]);
    }
}
