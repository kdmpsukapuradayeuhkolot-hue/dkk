<?php

// require_once '../contexts/AuthContext.php'; // Assuming AuthContext is converted

function useAuth() {
    // In PHP, simulate context with session or global
    if (!isset($_SESSION['auth'])) {
        throw new Exception('useAuth must be used within an AuthProvider');
    }
    return $_SESSION['auth'];
}
