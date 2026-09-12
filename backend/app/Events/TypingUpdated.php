<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TypingUpdated implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(public User $user, public int $recipientId, public bool $isTyping) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('chat.' . $this->recipientId)];
    }

    public function broadcastAs(): string
    {
        return 'typing.updated';
    }
}
