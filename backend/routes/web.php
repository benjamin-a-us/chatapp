<?php

Route::get('/password/reset/{token}', function (string $token) {
    return redirect(config('app.frontend_url', 'http://127.0.0.1:5173') . '/?reset_token=' . urlencode($token) . '&email=' . urlencode(request('email', '')));
})->name('password.reset');

Route::get('/', function () {
    return view('welcome');
});
