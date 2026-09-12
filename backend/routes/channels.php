<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('chat.{userId}', fn ($user, int $userId) => (int) $user->id === $userId);
