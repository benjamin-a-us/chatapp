<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AuthSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_fifth_failed_login_locks_the_account(): void
    {
        User::factory()->create(['email' => 'member@example.com', 'password' => Hash::make('correct-password')]);

        foreach (range(1, 4) as $attempt) {
            $response = $this->postJson('/api/login', ['email' => 'member@example.com', 'password' => 'wrong-password']);
            $response->assertStatus(422);
        }

        $this->postJson('/api/login', ['email' => 'member@example.com', 'password' => 'wrong-password'])
            ->assertStatus(429)
            ->assertJsonStructure(['message', 'locked_until']);

        $this->postJson('/api/login', ['email' => 'member@example.com', 'password' => 'correct-password'])
            ->assertStatus(429);
    }

    public function test_forgot_password_request_returns_a_safe_response(): void
    {
        User::factory()->create(['email' => 'member@example.com']);

        $this->postJson('/api/forgot-password', ['email' => 'member@example.com'])
            ->assertOk()
            ->assertJsonStructure(['message']);
    }

    public function test_expired_lockout_is_cleared_on_the_next_login(): void
    {
        User::factory()->create([
            'email' => 'member@example.com',
            'password' => Hash::make('correct-password'),
            'failed_login_attempts' => 5,
            'locked_until' => now()->subMinute(),
        ]);
        RateLimiter::hit('login:member@example.com|127.0.0.1', 300);

        $this->postJson('/api/login', ['email' => 'member@example.com', 'password' => 'correct-password'])
            ->assertOk()
            ->assertJsonStructure(['token', 'user']);
    }
}
