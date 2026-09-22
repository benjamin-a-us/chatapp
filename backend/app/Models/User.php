<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Auth\Passwords\CanResetPassword;
use Illuminate\Contracts\Auth\CanResetPassword as CanResetPasswordContract;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'last_seen_at', 'failed_login_attempts', 'locked_until', 'login_code_hash', 'login_code_expires_at', 'bio', 'suspended_at', 'headline', 'gender', 'phone', 'date_of_birth', 'education', 'work_experience'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements CanResetPasswordContract
{
    /** @use HasFactory<UserFactory> */
    use CanResetPassword, HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'locked_until' => 'datetime',
            'login_code_expires_at' => 'datetime',
            'failed_login_attempts' => 'integer',
            'suspended_at' => 'datetime',
            'date_of_birth' => 'date',
            'password' => 'hashed',
        ];
    }
}
