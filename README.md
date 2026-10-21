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

## 🚀 Alur Delegasi Otomatis (Tech Lead Responsibility Engine)
Ketika perintah diberikan kepada **`LEADA`**:
1. **Perancangan:** `LEADA` menerima instruksi dan memecahnya ke masing-masing domain spesialis.
2. **Infrastruktur (`INFRAS`):** Mempersiapkan container, status database, dan jaringan $\rightarrow$ `DONE ✅`.
3. **Coding (`CODER`):** Menulis kode, endpoints, dan lulus unit test $\rightarrow$ `DONE ✅`.
4. **Security (`SECU`):** Memindai kerentanan OWASP, otentikasi, dan sanitasi payload $\rightarrow$ `DONE ✅`.
5. **Approval Akhir (`LEADA`):** `LEADA` memvalidasi seluruh deliverables tim dan secara resmi menyatakan tugas **`APPROVED 🏆`** tuntas!

---

## 🛠️ Instalasi & Menjalankan

### Kebutuhan:
- [Bun](https://bun.sh/) (atau Node.js runtime)

### Menjalankan Server:
```bash
# Masuk ke direktori
cd /mnt/e/CODING/virtual-office-ai

# Jalankan server
bun run server.js
```

Buka browser di:
👉 **`http://localhost:3333`**

Kontrol Kamera:
- **Zoom In / Out:** Scroll roda mouse (0.25x – 3.5x)
- **Geser Layar (Pan):** Klik kiri dan drag mouse (1:1 stabil)
- **Reset Posisi:** Klik tombol `[⟲ RESET]` di pojok kanan atas atau klik ganda (*double click*) di kanvas
- **Buka Command Dispatcher:** Klik `[▲ BUKA DISPATCHER]` di bagian bawah layar (atau tekan tombol `ESC` untuk menutup)
