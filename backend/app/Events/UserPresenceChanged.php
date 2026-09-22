<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserPresenceChanged implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(public User $user, public bool $online) {}

    public function broadcastOn(): array
    {
        return [new Channel('chat-presence')];
    }

    public function broadcastAs(): string
    {
        return 'user.presence';
    }
}
