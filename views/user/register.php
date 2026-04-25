<?php
include 'db.php';
if (isset($_POST['register'])) {
    $nama = $_POST['nama'];
    $username = $_POST['username'];
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);

    $query = "INSERT INTO users (nama, username, password) VALUES ('$nama', '$username', '$password')";
    if (mysqli_query($conn, $query)) {
        header("Location: login.php");
    } else {
        $error = "Registrasi gagal, username mungkin sudah ada.";
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Register - Aurora</title>
    <style>
        body { font-family: 'Outfit', sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: rgba(255, 255, 255, 0.8); padding: 40px; border-radius: 20px; backdrop-filter: blur(10px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 350px; }
        input { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 10px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; border: none; border-radius: 10px; background: #e73c7e; color: white; font-weight: bold; cursor: pointer; }
    </style>
</head>
<body>
    <div class="card">
        <h2>Register</h2>
        <form method="POST">
            <input type="text" name="nama" placeholder="Nama Lengkap" required>
            <input type="text" name="username" placeholder="Username" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit" name="register">Daftar</button>
        </form>
        <p>Sudah punya akun? <a href="login.php">Login di sini</a></p>
    </div>
</body>
</html>