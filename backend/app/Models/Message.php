<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['sender_id', 'recipient_id', 'body', 'attachment_path', 'attachment_name', 'attachment_mime', 'attachment_size'])]
class Message extends Model
{
    protected $appends = ['attachment_url'];

    protected function getAttachmentUrlAttribute(): ?string
    {
        return $this->attachment_path ? url('/storage/' . $this->attachment_path) : null;
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }
}
