# 🏢 Virtual Office AI (2.5D Retro Pixel Art Headquarters)

Simulasi kantor virtual 2.5D bergaya retro pixel art untuk memantau dan mengoordinasikan tim agen AI otonom (**Leada**, **Coder**, **Secu**, dan **Infras**) secara interaktif dan real-time.

---

## 👥 Profil Agen & Pembagian Ranah (Squad Roles)

| Agen | Peran | Ranah Kerja | Palet & Ciri Visual |
| :--- | :--- | :--- | :--- |
| 👑 **LEADA** | **Tech Lead & Software Architect** | Perancangan arsitektur, delegasi sprint, evaluasi & persetujuan akhir | Blazer Royal Indigo, dasi emas, rambut perak, kacamata glint biru |
| 💻 **CODER** | **Core Developer & Implementer** | Menulis kode, endpoints API, schemas, compiler AST, unit tests | Hoodie oranye terang neon, headphone cyan di leher, sneakers putih |
| 🛡️ **SECU** | **Security & QA Auditor** | Audit celah keamanan (OWASP Top 10), token expiry, sanitasi payload | Topi fedora cokelat, trench coat hijau zaitun, sepatu bot kulit |
| ⚡ **INFRAS** | **DevOps & Cloud Specialist** | Docker compose, PostgreSQL, Redis, cluster networking, service status | Rompi teknisi Crimson Red, utility toolbelt, tech visor biru |

---

## 🗺️ Tata Ruang & Fitur Kantor (4 Zona Utama)

1. **💻 Area Meja Kerja & Server (Workstation Zone):**
   - Meja kayu panjang membentang dengan 4 pasang monitor PC dual-screen menyala (IDE & Terminal Matrix).
   - Animasi duduk di kursi kantor dan tangan mengetik aktif saat bekerja.
   - Papan putih arsitektur (*Whiteboard*) di dinding.
   - Rak server IT dengan lampu kedip fiber optik di pojok kiri.
   - Plang kutipan neon di dinding: *"TALK IS CHEAP. SHOW ME THE CODE."* & *"CODE · SECURE · SHIP"*.

2. **🍳 Ruang Dapur Khusus (Pantry & Cafe):**
   - Dinding partisi kaca transparan dengan plang pintu `[PANTRY]`.
   - Kulkas 2 pintu (freezer & chiller) dengan gagang pintu chrome vertikal.
   - Kompor 2 tungku induksi/gas dengan cincin merah menyala dan wajan.
   - Mesin pembuat kopi espresso dengan animasi kepulan uap panas.
   - Dispenser galon air mineral dan wastafel kran air.
   - Meja makan kayu dan 4 kursi makan untuk santai dan sarapan.

3. **🎮 Ruang Hiburan Khusus (Game Lounge):**
   - Dinding partisi kaca transparan dengan plang pintu `[GAME LOUNGE]` dan karpet beludru ungu.
   - **Meja Biliar (*Billiard Table*):** Karpet hijau laken biliar, 6 kantong lubang, bola putih (*cue ball*), dan kumpulan bola biliar segitiga warna-warni.
   - **PlayStation Setup:** TV Layar Lebar 4K dengan visual balap mobil dinamis, konsol PlayStation dengan strip LED biru cyan menyala, 2 gamepad wireless, dan sofa empuk santai merah marun.
   - Mesin *Arcade Retro* klasik di pojok.

4. **🛏️ Ruang Tidur Istirahat (Rest Dorm):**
   - Dinding partisi kaca transparan dengan pintu `[REST DORM]`.
   - Ranjang Tingkat 2 (*Bunk Bed*) kayu jati (kasur bawah biru & kasur atas hijau) dengan tangga panjat kayu dan meja lampu tidur.
   - Para agen tidur bergantian di bawah selimut dengan animasi gelembung `💤`.

---

## 🚪 Sistem Pintu Fisik & Anti-Nerobos Tembok (Waypoint Routing)
Agen tidak lagi menembus dinding secara sembarangan. Setiap ruangan memiliki titik koordinat pintu masuk fisik:
- **Pintu Dorm:** `[REST DORM]`
- **Pintu Pantry:** `[PANTRY]`
- **Pintu Game Lounge:** `[GAME LOUNGE]`

Setiap agen berpindah ruangan dengan alur nyata: melangkah ke pintu bagian dalam $\rightarrow$ keluar ke koridor tengah $\rightarrow$ melangkah ke pintu ruangan tujuan $\rightarrow$ masuk ke dalam ruangan.

---

## 🚀 Integrasi Interaktif OMP Asli (Real Runtime & Dynamic Delegation)

Sistem tidak lagi menggunakan pipeline hardcoded, timer buatan, atau laporan template simulasi. Backend sekarang terhubung langsung ke sesi runtime **OMP (`omp --mode rpc-ui`)**:

1. **Interaksi Fleksibel Terminal OMP:**
   - Instruksi dikirim langsung ke agent loop OMP yang aktif.
   - Mendukung perintah slash native (`/help`, `/model`, `/stats`, dll).
   - Mendukung mode pengiriman saat agen sibuk (`steer` untuk interupsi dinamis atau `followUp` untuk antrean pesan berikutnya).
   - Tombol `[■ STOP]` mengeksekusi `omp_abort` secara real-time.

2. **Delegasi Subagent Nyata (Bukan Mock):**
   - Event delegasi runtime (`subagent_lifecycle`, `subagent_progress`, `subagent_event`) diterjemahkan langsung ke visual kantor.
   - Subagent yang didelegasikan oleh Lead dipetakan ke role visual agen (`CODER`, `SECU`, `INFRAS`) sesuai spesialisasi tugas riil.
   - Mengarahkan prompt ke tab spesialis (misal Coder) akan mengarahkan subagent aktif yang relevan via `steer_subagent`, atau meminta Tech Lead mengoordinasikan tugas spesialis tersebut.

3. **Dukungan Dialog Interaktif OMP (Ask / Confirm / Select / Editor):**
   - Ketika agen membutuhkan input atau approval, form dialog OMP muncul secara interaktif di panel kantor dengan opsi jawaban, deskripsi, dan custom input.
   - Respon user diteruskan langsung ke OMP sebagai `extension_ui_response`.

## 🔍 Reaktivitas Tool Call OMP Real-Time
Animasi agen dan monitor PC dual-screen bereaksi dinamis terhadap tool call yang sedang dieksekusi:
* **`read` / `grep` / `glob` (Scanning):** Agen memegang tablet/dokumen, monitor menampilkan tree direktori dengan laser pemindai biru. Badge: `[📖 READ]`.
* **`edit` / `write` (Coding):** Agen mengetik cepat, partikel kode berkilau naik dari keyboard, monitor menampilkan syntax highlighting multi-warna. Badge: `[💻 CODE]`.
* **`bash` / `eval` (Terminal):** Monitor menampilkan konsol Matrix hijau dengan kursor berkedip cepat. Badge: `[⚙️ BASH]`.
* **`audit` / `security` (Security Gate):** Monitor menampilkan sapuan radar hijau melingkar. Badge: `[🛡️ AUDIT]`.
* **`plan` / `analyzing` (Thinking):** Balon pikiran perencanaan di atas kepala agen. Badge: `[💭 PLAN]`.

---

## 🛠️ Instalasi & Menjalankan

### Direktori Proyek:
`E:\DOLANAN PROGRAM\PORTO\Virtual-Office-AI`

### Menjalankan Server:
Bisa dijalankan dengan runtime **Bun** atau **Node.js** (tanpa dependency eksternal):
```bash
# Opsi 1: Menggunakan Bun
bun run server.js

# Opsi 2: Menggunakan Node.js
node server.js
```
Buka browser di:
👉 **`http://localhost:3333`**

Kontrol Kamera:
- **Zoom In / Out:** Scroll roda mouse (0.25x – 3.5x)
- **Geser Layar (Pan):** Klik kiri dan drag mouse (1:1 stabil)
- **Reset Posisi:** Klik tombol `[⟲ RESET]` di pojok kanan atas atau klik ganda (*double click*) di kanvas
- **Command Dispatcher:** Klik `[▲ BUKA DISPATCHER]` atau tekan `Esc` untuk membuka panel layar penuh. `Esc` menutup dan membuka kembali tanpa menghapus draft.
- **Salin/tempel:** Blok teks terminal lalu `Ctrl+C`, atau klik `COPY LOGS` untuk seluruh output. Tempel ke kolom instruksi dengan `Ctrl+V`. Jika browser menolak penyalinan otomatis, tombol menampilkan `TEKAN CTRL+C` dan memilih log.
- **Log baru:** Terminal mengikuti output hanya ketika posisi scroll berada di bawah dan tidak ada teks yang sedang diseleksi.
- **Instruksi:** `Enter` mengirim; `Shift+Enter` membuat baris baru.
- Setelah memperbarui file, restart server dari direktori proyek ini dan lakukan hard refresh (`Ctrl+Shift+R`) agar browser tidak memakai halaman lama.

### Batas akses file HTTP

Server hanya menyajikan `/`, `/index.html`, dan file di `/public/`. File proyek seperti `server.js` dan `package.json`, direktori, serta symlink yang mengarah ke luar direktori publik menghasilkan `404`. Path dengan encoding tidak valid menghasilkan `400`. Aset PNG dikirim sebagai `image/png`.

Jalankan regresi HTTP dengan Node.js:

```bash
npm test
```

Pengujian menjalankan server pada port sementara dan memeriksa halaman utama, aset, file hilang, traversal path, serta symlink. Backend belum memiliki autentikasi dispatcher; jangan mengekspos port server ke internet tanpa pembatasan akses.
