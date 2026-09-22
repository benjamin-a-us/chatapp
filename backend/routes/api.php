<?php

use App\Http\Controllers\ChatController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [ChatController::class, 'register']);
Route::post('/login', [ChatController::class, 'login']);
Route::post('/verify-login', [ChatController::class, 'verifyLogin']);
Route::post('/forgot-password', [ChatController::class, 'forgotPassword']);
Route::post('/reset-password', [ChatController::class, 'resetPassword']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn (Request $request) => $request->user());
    Route::patch('/profile', [ChatController::class, 'profile']);
    Route::post('/logout', [ChatController::class, 'logout']);
    Route::post('/heartbeat', [ChatController::class, 'heartbeat']);
    Route::get('/users', [ChatController::class, 'users']);
    Route::get('/users/{user}/profile', [ChatController::class, 'publicProfile']);
    Route::get('/users/{user}/messages', [ChatController::class, 'messages']);
    Route::post('/users/{user}/messages', [ChatController::class, 'sendMessage']);
    Route::post('/users/{user}/typing', [ChatController::class, 'typing']);
});
