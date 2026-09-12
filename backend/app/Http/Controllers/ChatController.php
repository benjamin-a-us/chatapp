<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Events\TypingUpdated;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
        $token = $user->createToken('chat-house')->plainTextToken;

        return response()->json(['user' => $user, 'token' => $token], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'The email or password is incorrect.'], 422);
        }

        $user->update(['last_seen_at' => now()]);
        return response()->json(['user' => $user, 'token' => $user->createToken('chat-house')->plainTextToken]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->update(['last_seen_at' => null]);
        $request->user()->currentAccessToken()?->delete();
        return response()->json(['message' => 'Signed out.']);
    }

    public function users(Request $request): JsonResponse
    {
        return response()->json(User::query()->whereKeyNot($request->user()->id)->where('last_seen_at', '>=', now()->subSeconds(30))->latest('last_seen_at')->get(['id', 'name', 'email', 'created_at', 'updated_at']));
    }

    public function heartbeat(Request $request): JsonResponse
    {
        $request->user()->update(['last_seen_at' => now()]);
        return response()->json(['ok' => true]);
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
        $data = $request->validate(['body' => ['required', 'string', 'max:5000']]);
        $message = Message::create(['sender_id' => $request->user()->id, 'recipient_id' => $user->id, 'body' => $data['body']]);
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
