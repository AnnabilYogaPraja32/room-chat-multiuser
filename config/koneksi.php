<?php
$host = "localhost";
$user = "root";
$pass = "";
$db   = "room_chat_multiuser"; // Nama database sesuai request kamu

$conn = mysqli_connect($host, $user, $pass, $db);

if (!$conn) {
    die("Koneksi gagal: " . mysqli_connect_error());
}
?>