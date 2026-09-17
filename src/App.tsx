import { useEffect, useState, useRef } from "react";
import { useAuth } from "./auth";
import bogaLogo from "./assets/logo-boga.png";

// ─── Tax Database ────────────────────────────────────────────────────────────

type TaxType = "PPH 21" | "PPH 4 ayat 2" | "PPH 23" | "PPH 26";
type CalcType = "flat" | "pasal17" | "p3b";
type P3BType = "ROYALTIES" | "SERVICES" | "INTEREST" | "BRANCH_PROFIT";

interface TaxCode {
  pph: TaxType;
  kode: string;
  nama: string;
  tarif: number | null;
  tipe: CalcType;
  p3bType?: P3BType;
  keywords: string;
}

const TAX_CODES: TaxCode[] = [
  // PPH 21
  { pph: "PPH 21", kode: "21-100-07", nama: "Tenaga Ahli (Pengacara, Akuntan, Arsitek, Dokter, Konsultan, Notaris, Pejabat Pembuat Akte Tanah, Penilai, Aktuaris)", tarif: null, tipe: "pasal17", keywords: "tenaga ahli pengacara akuntan arsitek dokter konsultan notaris pejabat akte penilai aktuaris" },
  { pph: "PPH 21", kode: "21-100-20", nama: "Jasa dalam Segala Bidang selain Tenaga Ahli (KOL, Pembuatan Meja dan Kursi, Jasa Photoshoot / Fotografer, Pemasangan Dekorasi, Service Maintenance Lift, Service dan Cuci AC, Jasa Perbaikan, Jasa Cleaning, Bongkar Pasang, Penggantian Cover Sofa, Jasa Service Printer, Jasa Pengambilan Sampah, Jasa Ridgid, Jasa Instalasi)", tarif: null, tipe: "pasal17", keywords: "jasa segala bidang kol foto fotografer photographer dekorasi lift ac cleaning perbaikan printer sampah instalasi meja kursi sofa" },
  // PPH 4 ayat 2
  { pph: "PPH 4 ayat 2", kode: "28-409-25", nama: "Pekerjaan Konstruksi Terintegrasi yang Dilakukan oleh Penyedia Jasa yang Memiliki Sertifikat Badan Usaha", tarif: 2.65, tipe: "flat", keywords: "konstruksi terintegrasi sertifikat badan usaha memiliki" },
  { pph: "PPH 4 ayat 2", kode: "28-409-26", nama: "Pekerjaan Konstruksi Terintegrasi yang Dilakukan oleh Penyedia Jasa yang Tidak Memiliki Sertifikat Badan Usaha", tarif: 4, tipe: "flat", keywords: "konstruksi terintegrasi tidak memiliki sertifikat badan usaha" },
  { pph: "PPH 4 ayat 2", kode: "28-423-01", nama: "Pemotongan PPh atas penjualan barang atau penyerahan jasa oleh WP dengan peredaran bruto tertentu (PP23 / PP55)", tarif: 0.5, tipe: "flat", keywords: "pp23 pp55 peredaran bruto umkm" },
  { pph: "PPH 4 ayat 2", kode: "28-403-02", nama: "Sewa Tanah / Sewa Bangunan (seperti Mall / Ruko, Rental / Installment, Service Charge, Utilities, dsb)", tarif: 10, tipe: "flat", keywords: "sewa tanah bangunan mall ruko rental installment service charge utilities" },
  { pph: "PPH 4 ayat 2", kode: "28-409-22", nama: "Pekerjaan Konstruksi yang Dilakukan oleh Penyedia Jasa yang Memiliki Sertifikat Badan Usaha Kualifikasi Kecil atau Sertifikat Kompetensi Kerja untuk Usaha Orang Perseorangan", tarif: 1.75, tipe: "flat", keywords: "konstruksi kecil kualifikasi orang perseorangan sertifikat kompetensi" },
  { pph: "PPH 4 ayat 2", kode: "28-409-23", nama: "Pekerjaan Konstruksi yang Dilakukan oleh Penyedia Jasa yang Tidak Memiliki Sertifikat Badan Usaha Atau Sertifikat Kompetensi Kerja", tarif: 4, tipe: "flat", keywords: "konstruksi tidak sertifikat kompetensi" },
  { pph: "PPH 4 ayat 2", kode: "28-409-24", nama: "Pekerjaan Konstruksi yang Dilakukan oleh Penyedia Jasa yang Memiliki Sertifikat Selain Kualifikasi Kecil atau Orang Perseorangan", tarif: 2.65, tipe: "flat", keywords: "konstruksi sertifikat menengah besar selain kecil" },
  // PPH 23
  { pph: "PPH 23", kode: "24-101-01", nama: "Dividen", tarif: 15, tipe: "flat", keywords: "dividen dividend" },
  { pph: "PPH 23", kode: "24-104-05", nama: "Jasa Aktuaris", tarif: 2, tipe: "flat", keywords: "jasa aktuaris" },
  { pph: "PPH 23", kode: "24-104-06", nama: "Jasa Akuntansi, Pembukuan, dan Atestasi Laporan Keuangan", tarif: 2, tipe: "flat", keywords: "akuntansi pembukuan atestasi laporan keuangan" },
  { pph: "PPH 23", kode: "24-104-07", nama: "Jasa Hukum", tarif: 2, tipe: "flat", keywords: "jasa hukum legal" },
  { pph: "PPH 23", kode: "24-104-10", nama: "Jasa Perancang (Design)", tarif: 2, tipe: "flat", keywords: "jasa perancang design desain grafis" },
  { pph: "PPH 23", kode: "24-102-01", nama: "Bunga", tarif: 15, tipe: "flat", keywords: "bunga interest" },
  { pph: "PPH 23", kode: "24-104-16", nama: "Jasa Pengolahan Limbah", tarif: 2, tipe: "flat", keywords: "limbah waste pengolahan" },
  { pph: "PPH 23", kode: "24-104-17", nama: "Jasa Penyedia Tenaga Kerja dan/atau Tenaga Ahli (Outsourcing Services)", tarif: 2, tipe: "flat", keywords: "outsourcing tenaga kerja ahli" },
  { pph: "PPH 23", kode: "24-104-18", nama: "Jasa Perantara (Pluxee, Komisi, Chope, Fee Xendit)", tarif: 2, tipe: "flat", keywords: "perantara komisi fee pluxee chope xendit" },
  { pph: "PPH 23", kode: "24-104-20", nama: "Jasa Kustodian / Penyimpanan / Penitipan (seperti Crown, Transnational)", tarif: 2, tipe: "flat", keywords: "kustodian penyimpanan penitipan crown transnational" },
  { pph: "PPH 23", kode: "24-104-23", nama: "Jasa Pembuatan Sarana Promosi Film, Iklan, Poster, Foto, Slide, Klise, Banner, Pamphlet, Baliho dan Folder", tarif: 2, tipe: "flat", keywords: "promosi film iklan poster foto banner pamphlet baliho folder slide klise" },
  { pph: "PPH 23", kode: "24-104-24", nama: "Jasa Sehubungan Dengan Software Atau Hardware Atau Sistem Komputer, Termasuk Perawatan, Pemeliharaan dan Perbaikan (ESB, OTP Boga Apps, Google Cloud Platform, Google Workplace, Whatsapp Authentication)", tarif: 2, tipe: "flat", keywords: "software hardware sistem komputer it google cloud workplace whatsapp esb otp aplikasi maintenance" },
  { pph: "PPH 23", kode: "24-103-01", nama: "Royalti", tarif: 15, tipe: "flat", keywords: "royalti royalty" },
  { pph: "PPH 23", kode: "24-104-25", nama: "Jasa Pembuatan dan Pengelolaan Website", tarif: 2, tipe: "flat", keywords: "website web pembuatan pengelolaan" },
  { pph: "PPH 23", kode: "24-104-26", nama: "Jasa Internet termasuk Instalasi / Pemasangan", tarif: 2, tipe: "flat", keywords: "internet instalasi pemasangan wifi" },
  { pph: "PPH 23", kode: "24-104-28", nama: "Jasa Instalasi / Pemasangan Mesin, Peralatan, Listrik, Telepon, Air, Gas, AC, TV Kabel", tarif: 2, tipe: "flat", keywords: "instalasi pemasangan mesin listrik telepon air gas ac tv kabel" },
  { pph: "PPH 23", kode: "24-104-29", nama: "Jasa Perawatan / Perbaikan / Pemeliharaan Mesin, Peralatan, Listrik, Telepon, Air, Gas, AC, TV Kabel", tarif: 2, tipe: "flat", keywords: "perawatan perbaikan pemeliharaan maintenance mesin listrik ac kabel" },
  { pph: "PPH 23", kode: "24-104-30", nama: "Jasa Perawatan Kendaraan (Service Mobil, Truck)", tarif: 2, tipe: "flat", keywords: "kendaraan mobil truck service servis" },
  { pph: "PPH 23", kode: "24-104-31", nama: "Jasa Maklon (Jahit / Bordir Kain, Pakaian, Apron, Topi)", tarif: 2, tipe: "flat", keywords: "maklon jahit bordir kain pakaian apron topi" },
  { pph: "PPH 23", kode: "24-104-33", nama: "Jasa Penyelenggara Kegiatan / Event Organizer", tarif: 2, tipe: "flat", keywords: "event organizer eo penyelenggara kegiatan" },
  { pph: "PPH 23", kode: "24-104-34", nama: "Jasa Iklan / Promosi (Sponsorship, Kalibrr Platform Subscription, KOL, Paid Promote, Ads Grab)", tarif: 2, tipe: "flat", keywords: "iklan promosi sponsorship kol ads grab kalibrr" },
  { pph: "PPH 23", kode: "24-104-35", nama: "Jasa Pembasmian Hama (Pest Control, Pest Treatment, General Pest)", tarif: 2, tipe: "flat", keywords: "hama pest control fumigasi" },
  { pph: "PPH 23", kode: "24-104-36", nama: "Jasa Kebersihan / Cleaning Service (Iuran Angkutan Sampah, Pengangkutan Sampah)", tarif: 2, tipe: "flat", keywords: "kebersihan cleaning service sampah angkutan" },
  { pph: "PPH 23", kode: "24-104-39", nama: "Jasa Katering / Catering", tarif: 2, tipe: "flat", keywords: "katering catering makanan food" },
  { pph: "PPH 23", kode: "24-104-40", nama: "Jasa Kirim / Pengiriman (JNE, Pick Up, Ongkir, Delivery Charge, Ongkos Angkut, Freight Charge, Freight Forwarding, Messenger)", tarif: 2, tipe: "flat", keywords: "kirim pengiriman jne delivery charge ongkir freight forwarding messenger" },
  { pph: "PPH 23", kode: "24-104-41", nama: "Jasa Logistik (Trucking Charge, Multidrop Charge – Dunia Express Transindo)", tarif: 2, tipe: "flat", keywords: "logistik trucking multidrop express transindo" },
  { pph: "PPH 23", kode: "24-104-42", nama: "Jasa Pengurusan Dokumen (Proses Perpanjangan Dokumen)", tarif: 2, tipe: "flat", keywords: "pengurusan dokumen perpanjangan" },
  { pph: "PPH 23", kode: "24-100-02", nama: "Sewa Alat dan Kendaraan (Meja, Kursi, Kipas, Dispenser, Mesin, Mobil, Bus, Fotocopy, Panggung, HT, Sound System)", tarif: 2, tipe: "flat", keywords: "sewa alat kendaraan meja kursi kipas dispenser mesin mobil bus fotocopy panggung ht sound system" },
  { pph: "PPH 23", kode: "24-104-45", nama: "Jasa Laboratorium / Pengujian (Uji Air, Sampel, Analisa, Medical Check Up / MCU)", tarif: 2, tipe: "flat", keywords: "laboratorium pengujian uji air sampel analisa mcu medical check up" },
  { pph: "PPH 23", kode: "24-104-53", nama: "Jasa Dekorasi", tarif: 2, tipe: "flat", keywords: "dekorasi decoration" },
  { pph: "PPH 23", kode: "24-104-54", nama: "Jasa Cetak (Foamboard, Poster, Banner, Buku Menu, Sticker)", tarif: 2, tipe: "flat", keywords: "cetak foamboard poster banner buku menu sticker print" },
  { pph: "PPH 23", kode: "24-104-55", nama: "Jasa Penerjemahan / Translator", tarif: 2, tipe: "flat", keywords: "penerjemahan translator terjemah" },
  { pph: "PPH 23", kode: "24-104-56", nama: "Jasa Ekspedisi (Layanan Angkutan dan Kendaraan – Agung Solusi Dingin, Pengangkutan Reefer Truck – Rantai Dingin Indonesia)", tarif: 2, tipe: "flat", keywords: "ekspedisi angkutan reefer truck dingin" },
  { pph: "PPH 23", kode: "24-104-60", nama: "Jasa Pelatihan (Kursus, Training, Seminar)", tarif: 2, tipe: "flat", keywords: "pelatihan kursus training seminar" },
  { pph: "PPH 23", kode: "24-104-62", nama: "Jasa Sertifikasi (Halal MUI, Kalibrasi)", tarif: 2, tipe: "flat", keywords: "sertifikasi halal mui kalibrasi" },
  { pph: "PPH 23", kode: "24-104-63", nama: "Jasa Survey", tarif: 2, tipe: "flat", keywords: "survey survei" },
  { pph: "PPH 23", kode: "24-104-64", nama: "Jasa Tester", tarif: 2, tipe: "flat", keywords: "tester test uji coba" },
  { pph: "PPH 23", kode: "24-104-02", nama: "Jasa Manajemen (Management Fee, Utilities / Service Charge Mall, dsb)", tarif: 2, tipe: "flat", keywords: "manajemen management fee utilities service charge mall" },
  { pph: "PPH 23", kode: "24-104-03", nama: "Jasa Konsultan (Konsultan Manajemen, Pajak, Hukum, Mystery Shopping)", tarif: 2, tipe: "flat", keywords: "konsultan manajemen pajak hukum mystery shopping" },
  { pph: "PPH 23", kode: "24-104-04", nama: "Jasa Penilai (Appraisal)", tarif: 2, tipe: "flat", keywords: "penilai appraisal penilaian" },
  // PPH 26
  { pph: "PPH 26", kode: "27-103-01", nama: "Royalti", tarif: 20, tipe: "p3b", p3bType: "ROYALTIES", keywords: "royalti royalty" },
  { pph: "PPH 26", kode: "27-104-01", nama: "Jasa, Pekerjaan dan Kegiatan (Services, Konsultan, Audit, Design)", tarif: 20, tipe: "p3b", p3bType: "SERVICES", keywords: "jasa pekerjaan kegiatan services konsultan audit design" },
  { pph: "PPH 26", kode: "27-100-01", nama: "Sewa dan Penghasilan Lain (Equipment Rental)", tarif: 20, tipe: "p3b", p3bType: "INTEREST", keywords: "sewa penghasilan lain equipment rental" },
];

interface P3BCountry {
  name: string;
  code: string;
  INTEREST: string;
  ROYALTIES: string;
  BRANCH_PROFIT: string;
  SERVICES: string;
}

const P3B_COUNTRIES: P3BCountry[] = [
  { name: "Algeria (Aljazair)", code: "ALG", INTEREST: "15%", ROYALTIES: "15%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Australia", code: "AUS", INTEREST: "10%", ROYALTIES: "10% / 15%", BRANCH_PROFIT: "15%", SERVICES: "0%" },
  { name: "Austria", code: "AUT", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "12%", SERVICES: "0%" },
  { name: "Bangladesh", code: "BLD", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Belgium (Belgia)", code: "BLG", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Brunei Darussalam", code: "BRN", INTEREST: "10%", ROYALTIES: "15%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Bulgaria", code: "BUL", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "15%", SERVICES: "0%" },
  { name: "Canada (Kanada)", code: "KAN", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "15%", SERVICES: "0%" },
  { name: "China", code: "CIN", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Croatia (Kroasia)", code: "KRS", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Czech Republic (Republik Ceko)", code: "CZE", INTEREST: "12,50%", ROYALTIES: "12,50%", BRANCH_PROFIT: "12,50%", SERVICES: "0%" },
  { name: "Denmark", code: "DEN", INTEREST: "10%", ROYALTIES: "15%", BRANCH_PROFIT: "15%", SERVICES: "0%" },
  { name: "Egypt (Mesir)", code: "EGY", INTEREST: "15%", ROYALTIES: "15%", BRANCH_PROFIT: "15%", SERVICES: "0%" },
  { name: "Finland (Finlandia)", code: "FIN", INTEREST: "10%", ROYALTIES: "10% / 15%", BRANCH_PROFIT: "15%", SERVICES: "0%" },
  { name: "France (Perancis)", code: "FRA", INTEREST: "15%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Germany (Jerman)", code: "GER", INTEREST: "10%", ROYALTIES: "10% / 15%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Hong Kong", code: "HKG", INTEREST: "10%", ROYALTIES: "5%", BRANCH_PROFIT: "5%", SERVICES: "0%" },
  { name: "Hungary (Hungaria)", code: "HUG", INTEREST: "15%", ROYALTIES: "15%", BRANCH_PROFIT: "N/A", SERVICES: "0%" },
  { name: "India", code: "IND", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Iran", code: "IRN", INTEREST: "10%", ROYALTIES: "12%", BRANCH_PROFIT: "7%", SERVICES: "0%" },
  { name: "Italy (Italia)", code: "ITA", INTEREST: "10%", ROYALTIES: "10% / 15%", BRANCH_PROFIT: "12%", SERVICES: "0%" },
  { name: "Japan (Jepang)", code: "JPN", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Jordan (Yordania)", code: "JRD", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "N/A", SERVICES: "0%" },
  { name: "North Korea (Korea Utara)", code: "KDR", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "South Korea (Korea Selatan)", code: "KOR", INTEREST: "10%", ROYALTIES: "15%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Kuwait", code: "KWT", INTEREST: "5%", ROYALTIES: "20%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Luxembourg", code: "LXM", INTEREST: "10%", ROYALTIES: "12,50%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Malaysia", code: "MLY", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "12,50%", SERVICES: "0%" },
  { name: "Morocco (Maroko)", code: "MRK", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Mexico (Meksiko)", code: "MEX", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Mongolia", code: "MNG", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Netherlands (Belanda)", code: "NTH", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "New Zealand (Selandia Baru)", code: "NWZ", INTEREST: "10%", ROYALTIES: "15%", BRANCH_PROFIT: "N/A", SERVICES: "0%" },
  { name: "Norway (Norwegia)", code: "NOR", INTEREST: "10%", ROYALTIES: "10% / 15%", BRANCH_PROFIT: "15%", SERVICES: "0%" },
  { name: "Pakistan", code: "PAK", INTEREST: "15%", ROYALTIES: "15%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Papua New Guinea (Papua Nugini)", code: "PNG", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "15%", SERVICES: "0%" },
  { name: "Philippines (Philipina)", code: "PHL", INTEREST: "15%", ROYALTIES: "15% / 25%", BRANCH_PROFIT: "20%", SERVICES: "0%" },
  { name: "Poland (Polandia)", code: "POL", INTEREST: "10%", ROYALTIES: "15%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Portugal", code: "PRT", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Qatar", code: "QTR", INTEREST: "10%", ROYALTIES: "5%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Romania", code: "ROM", INTEREST: "12,50%", ROYALTIES: "12,5% / 15%", BRANCH_PROFIT: "12,50%", SERVICES: "0%" },
  { name: "Rusia", code: "RUS", INTEREST: "15%", ROYALTIES: "15%", BRANCH_PROFIT: "12,50%", SERVICES: "0%" },
  { name: "Saudi Arabia", code: "SAR", INTEREST: "N/A", ROYALTIES: "N/A", BRANCH_PROFIT: "N/A", SERVICES: "0%" },
  { name: "Serbia", code: "SRB", INTEREST: "10%", ROYALTIES: "15%", BRANCH_PROFIT: "15%", SERVICES: "0%" },
  { name: "Seychelles", code: "SEY", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "N/A", SERVICES: "0%" },
  { name: "Singapore (Singapura)", code: "SNG", INTEREST: "10%", ROYALTIES: "10% / 8%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Slovakia", code: "SLV", INTEREST: "10%", ROYALTIES: "10% / 15%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "South Africa (Afrika Selatan)", code: "STA", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Spain (Spanyol)", code: "SPN", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Sri Lanka", code: "SRL", INTEREST: "15%", ROYALTIES: "15%", BRANCH_PROFIT: "Sesuai UU Domestik", SERVICES: "0%" },
  { name: "Sudan", code: "SUD", INTEREST: "15%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Suriname", code: "SUR", INTEREST: "15%", ROYALTIES: "15%", BRANCH_PROFIT: "15%", SERVICES: "0%" },
  { name: "Sweden (Swedia)", code: "SWD", INTEREST: "10%", ROYALTIES: "10% / 15%", BRANCH_PROFIT: "15%", SERVICES: "0%" },
  { name: "Switzerland (Swiss)", code: "SWI", INTEREST: "10%", ROYALTIES: "12,50%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Syria (Suriah)", code: "SYR", INTEREST: "10%", ROYALTIES: "15% / 20%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Taipei (Taiwan)", code: "TWN", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "5%", SERVICES: "0%" },
  { name: "Thailand", code: "THA", INTEREST: "RI=15% / THAI=10%/25%", ROYALTIES: "15%", BRANCH_PROFIT: "Sesuai UU Domestik", SERVICES: "0%" },
  { name: "Tunisia", code: "TUN", INTEREST: "12%", ROYALTIES: "15%", BRANCH_PROFIT: "12%", SERVICES: "0%" },
  { name: "Turkey (Turki)", code: "TUR", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "15%", SERVICES: "0%" },
  { name: "United Arab Emirates (UAE)", code: "UAE", INTEREST: "7%", ROYALTIES: "5%", BRANCH_PROFIT: "5%", SERVICES: "0%" },
  { name: "Ukraine (Ukraina)", code: "UKR", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "United Kingdom (Inggris)", code: "UKE", INTEREST: "10%", ROYALTIES: "10% / 15%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "United States of America (Amerika)", code: "USA", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Uzbekistan", code: "UZB", INTEREST: "10%", ROYALTIES: "10%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Venezuela", code: "VEN", INTEREST: "10%", ROYALTIES: "20%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
  { name: "Vietnam", code: "VET", INTEREST: "15%", ROYALTIES: "15%", BRANCH_PROFIT: "10%", SERVICES: "0%" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function parseRupiah(str: string): number {
  const cleaned = str.replace(/[^\d]/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
}

function formatInput(val: string): string {
  const num = parseRupiah(val);
  if (!num) return "";
  return num.toLocaleString("id-ID");
}

function calculatePasal17(dpp: number): number {
  const pkp = dpp * 0.5;
  const brackets = [
    { limit: 60_000_000, rate: 0.05 },
    { limit: 250_000_000, rate: 0.15 },
    { limit: 500_000_000, rate: 0.25 },
    { limit: 5_000_000_000, rate: 0.3 },
    { limit: Infinity, rate: 0.35 },
  ];
  let tax = 0;
  let remaining = pkp;
  let prev = 0;
  for (const b of brackets) {
    if (remaining <= 0) break;
    const chunk = Math.min(remaining, b.limit - prev);
    tax += chunk * b.rate;
    remaining -= chunk;
    prev = b.limit;
  }
  return tax;
}

function getPPHLabel(pph: string): string {
  if (pph === "PPH 4 ayat 2") return "PPh 4 Ayat (2)";
  if (pph === "PPH 21") return "PPh 21";
  if (pph === "PPH 23") return "PPh 23";
  if (pph === "PPH 26") return "PPh 26";
  return pph;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type WPType = "orang_pribadi" | "badan_dalam" | "badan_luar" | null;
type SKBStatus = "ada" | "tidak" | null;
type CORStatus = "ada" | "tidak" | null;
type PPNStatus = "ada" | "tidak" | null;

interface CalcState {
  wpType: WPType;
  selectedCode: TaxCode | null;
  skbStatus: SKBStatus;
  skbNomor: string;
  skbChecked: boolean;
  skbValid: boolean;
  corStatus: CORStatus;
  selectedCountry: P3BCountry | null;
  dppJasa: string;
  dppBarang: string;
  ppnStatus: PPNStatus;
  ppnNominal: string;
}

// ─── Step indicators ─────────────────────────────────────────────────────────

const STEPS = [
  "Jenis Wajib Pajak",
  "Kode Objek Pajak",
  "DPP",
  "PPN",
  "PPh Terutang",
  "Hasil Perhitungan",
];

// ─── Calculation History ─────────────────────────────────────────────────────

interface HistoryRecord {
  id: string;
  created_at: string;
  pph_type: string | null;
  object_code: string | null;
  object_name: string | null;
  pph_terutang: number | null;
  nominal_vendor: number | null;
  calculation_data: {
    state: CalcState;
    effectiveTarif: number | null;
    ppnNum: number;
    dppJasaNum: number;
    dppBarangNum: number;
    pphTerutang: number;
    totalTagihan: number;
    nominalVendor: number;
    pasal17Breakdown: { label: string; rate: number; amount: number; tax: number }[];
  } | null;
}

const HISTORY_STORAGE_KEY = "boga_tax_auth_session";
const HISTORY_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const HISTORY_SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

function getAccessToken(): string {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    const session = raw ? JSON.parse(raw) as { access_token?: string } : null;
    return session?.access_token ?? "";
  } catch {
    return "";
  }
}

async function historyRequest(path: string, options: RequestInit = {}) {
  const token = getAccessToken();
  if (!HISTORY_SUPABASE_URL || !HISTORY_SUPABASE_ANON_KEY || !token) {
    throw new Error("Sesi login tidak ditemukan.");
  }

  const response = await fetch(`${HISTORY_SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: HISTORY_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.msg || data?.hint || data?.details || "Gagal mengakses riwayat perhitungan.");
  }
  return data;
}

function formatHistoryDate(value: string): string {
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function App() {
  const { user, signOut } = useAuth();
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<"calculator" | "history">("calculator");
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [saveToHistory, setSaveToHistory] = useState(false);
  const [savingHistory, setSavingHistory] = useState(false);
  const [historySaved, setHistorySaved] = useState(false);
  const [profileName, setProfileName] = useState(() => (user?.user_metadata?.full_name as string | undefined) || user?.email || "Pengguna");

  useEffect(() => {
    let cancelled = false;
    async function loadProfileName() {
      const metadataName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
      if (metadataName) {
        setProfileName(metadataName);
        return;
      }
      if (!user?.id) return;
      try {
        const data = await historyRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=full_name&limit=1`, {
          headers: { Accept: "application/json" },
        });
        const name = data?.[0]?.full_name;
        if (!cancelled && typeof name === "string" && name.trim()) setProfileName(name.trim());
      } catch {
        // Email remains the fallback if profile lookup is unavailable.
      }
    }
    void loadProfileName();
    return () => { cancelled = true; };
  }, [user?.id, user?.user_metadata?.full_name, user?.email]);

  const loadHistory = async () => {
    if (!user?.id) return;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const data = await historyRequest(`/rest/v1/calculation_history?select=*&user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc`);
      setHistory((data ?? []) as HistoryRecord[]);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Gagal memuat riwayat perhitungan.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = () => {
    setPage("history");
    void loadHistory();
  };

  const saveCurrentCalculation = async () => {
    if (!saveToHistory || historySaved || !user?.id || !state.selectedCode) return;
    setSavingHistory(true);
    try {
      await historyRequest("/rest/v1/calculation_history", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          user_id: user.id,
          pph_type: getPPHLabel(state.selectedCode.pph),
          object_code: state.selectedCode.kode,
          object_name: state.selectedCode.nama,
          pph_terutang: pphTerutang,
          nominal_vendor: nominalVendor,
          calculation_data: {
            state,
            effectiveTarif: effectiveTarif ?? null,
            ppnNum,
            dppJasaNum,
            dppBarangNum,
            pphTerutang,
            totalTagihan,
            nominalVendor,
            pasal17Breakdown,
          },
        }),
      });
      setHistorySaved(true);
      setSaveToHistory(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Gagal menyimpan perhitungan ke riwayat.");
    } finally {
      setSavingHistory(false);
    }
  };

  const [state, setState] = useState<CalcState>({
    wpType: null,
    selectedCode: null,
    skbStatus: null,
    skbNomor: "",
    skbChecked: false,
    skbValid: false,
    corStatus: null,
    selectedCountry: null,
    dppJasa: "",
    dppBarang: "",
    ppnStatus: null,
    ppnNominal: "",
  });

  const set = (patch: Partial<CalcState>) => setState((s) => ({ ...s, ...patch }));

  // Filter tax codes based on WP type and search
  const filteredCodes = TAX_CODES.filter((tc) => {
    if (state.wpType === "orang_pribadi" && tc.pph !== "PPH 21") return false;
    if (state.wpType === "badan_dalam" && tc.pph !== "PPH 4 ayat 2" && tc.pph !== "PPH 23") return false;
    if (state.wpType === "badan_luar" && tc.pph !== "PPH 26") return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      tc.kode.toLowerCase().includes(q) ||
      tc.nama.toLowerCase().includes(q) ||
      tc.keywords.toLowerCase().includes(q)
    );
  });

  // Effective tarif
  const getEffectiveTarif = (): number | null => {
    const code = state.selectedCode;
    if (!code) return null;
    if (state.skbStatus === "ada" && state.skbChecked && state.skbValid) return 0;
    if (code.tipe === "pasal17") return null; // progressive
    if (code.tipe === "p3b") {
      if (state.corStatus === "ada" && state.selectedCountry && code.p3bType) {
        const rate = state.selectedCountry[code.p3bType as keyof P3BCountry];
        if (rate && rate !== "N/A" && rate !== "0%") {
          const primary = rate.split("/")[0].trim();
          const num = parseFloat(primary.replace(",", ".").replace("%", ""));
          return isNaN(num) ? 20 : num;
        }
        return 0;
      }
      return 20;
    }
    return code.tarif ?? 0;
  };

  const effectiveTarif = getEffectiveTarif();
  const dppJasaNum = parseRupiah(state.dppJasa);
  const dppBarangNum = parseRupiah(state.dppBarang);
  const ppnNum = parseRupiah(state.ppnNominal);

  let pphTerutang = 0;
  let pphNote = "";
  if (state.selectedCode) {
    if (state.skbStatus === "ada" && state.skbChecked && state.skbValid) {
      pphTerutang = 0;
      pphNote = "Tarif 0% — Surat Keterangan Bebas (SKB) aktif";
    } else if (state.selectedCode.tipe === "pasal17") {
      pphTerutang = calculatePasal17(dppJasaNum);
      pphNote = `DPP × 50% = PKP, lalu dihitung progresif Pasal 17`;
    } else if (state.selectedCode.tipe === "p3b" && state.corStatus === "ada" && state.selectedCountry) {
      const tarif = effectiveTarif ?? 20;
      pphTerutang = (dppJasaNum * tarif) / 100;
      pphNote = `Tarif P3B ${state.selectedCountry.name}: ${tarif}%`;
    } else {
      const tarif = effectiveTarif ?? (state.selectedCode.tarif ?? 0);
      pphTerutang = (dppJasaNum * tarif) / 100;
      pphNote = `DPP Jasa × ${tarif}%`;
    }
  }

  const totalTagihan = dppJasaNum + dppBarangNum + (state.ppnStatus === "ada" ? ppnNum : 0);
  const nominalVendor = totalTagihan - pphTerutang;

  // Validation per step
  const canNext = (): boolean => {
    switch (step) {
      case 0: return !!state.wpType;
      case 1: {
        if (!state.selectedCode) return false;
        if (state.wpType !== "badan_luar") {
          if (state.skbStatus === null) return false;
          if (state.skbStatus === "ada" && !state.skbChecked) return false;
        }
        if (state.wpType === "badan_luar") {
          if (state.corStatus === null) return false;
          if (state.corStatus === "ada" && !state.selectedCountry) return false;
        }
        return true;
      }
      case 2: return dppJasaNum > 0 || dppBarangNum > 0;
      case 3: return state.ppnStatus !== null;
      case 4: return true;
      default: return false;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setState({
      wpType: null, selectedCode: null, skbStatus: null, skbNomor: "", skbChecked: false,
      skbValid: false, corStatus: null, selectedCountry: null, dppJasa: "", dppBarang: "",
      ppnStatus: null, ppnNominal: "",
    });
    setSearch("");
    setStep(0);
    setSaveToHistory(false);
    setHistorySaved(false);
  };

  const pasal17Breakdown = (() => {
    if (!state.selectedCode || state.selectedCode.tipe !== "pasal17" || dppJasaNum === 0) return [];
    const pkp = dppJasaNum * 0.5;
    const brackets = [
      { label: "s.d. Rp 60.000.000", limit: 60_000_000, rate: 5 },
      { label: "Rp 60.000.001 – Rp 250.000.000", limit: 250_000_000, rate: 15 },
      { label: "Rp 250.000.001 – Rp 500.000.000", limit: 500_000_000, rate: 25 },
      { label: "Rp 500.000.001 – Rp 5.000.000.000", limit: 5_000_000_000, rate: 30 },
      { label: "di atas Rp 5.000.000.000", limit: Infinity, rate: 35 },
    ];
    const result: { label: string; rate: number; amount: number; tax: number }[] = [];
    let remaining = pkp;
    let prev = 0;
    for (const b of brackets) {
      if (remaining <= 0) break;
      const chunk = Math.min(remaining, b.limit - prev);
      result.push({ label: b.label, rate: b.rate, amount: chunk, tax: chunk * b.rate / 100 });
      remaining -= chunk;
      prev = b.limit;
    }
    return result;
  })();

  return (
    <div className="min-h-screen" style={{ background: "#f2f2f2", fontFamily: "'Nunito', sans-serif" }}>
      {/* ── Header ── */}
      <header className="no-print" style={{ background: "#c8102e", borderBottom: "4px solid #000" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 0 14px" }}>
            <div style={{ background: "#fff", borderRadius: 7, padding: "5px 8px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,.12)" }}>
              <img src={bogaLogo} alt="Boga Group" style={{ width: 58, height: 42, objectFit: "contain", display: "block" }} />
            </div>
            <div>
              <div style={{ color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.85, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>
                KALKULATOR PAJAK
              </div>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 900, letterSpacing: "0.02em", lineHeight: 1.1 }}>
                PERHITUNGAN PAJAK BOGA GROUP
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ color: "#fff", opacity: 0.95, fontSize: 11, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
                <div style={{ fontWeight: 800, fontFamily: "'Nunito', sans-serif", fontSize: 13, marginBottom: 2 }}>{profileName}</div>
                <div>Mengetahui Nominal PPh Pembayaran ke Vendor</div>
              </div>
              <button
                type="button"
                onClick={openHistory}
                className="no-print"
                style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,.45)", background: "rgba(0,0,0,.12)", color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                📋 Riwayat Perhitungan
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="no-print"
                style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,.45)", background: "rgba(0,0,0,.12)", color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Progress Bar ── */}
      {page === "calculator" && <div className="no-print" style={{ background: "#1a1a1a", borderBottom: "2px solid #000" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", overflowX: "auto" }}>
            {STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => i < step && setStep(i)}
                style={{
                  flex: 1,
                  minWidth: 100,
                  padding: "10px 6px",
                  background: "none",
                  border: "none",
                  borderBottom: i === step ? "3px solid #c8102e" : "3px solid transparent",
                  cursor: i < step ? "pointer" : "default",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: i < step ? "#c8102e" : i === step ? "#fff" : "#3a3a3a",
                  color: i < step ? "#fff" : i === step ? "#c8102e" : "#888",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 10, color: i === step ? "#fff" : i < step ? "#c8102e" : "#666", fontWeight: i === step ? 700 : 500, whiteSpace: "nowrap" }}>
                  {s}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>}

      {/* ── Main Content ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
        {page === "history" ? (
          <HistoryPage
            history={history}
            loading={historyLoading}
            error={historyError}
            onBack={() => setPage("calculator")}
            onRefresh={() => void loadHistory()}
          />
        ) : (
        <>
        {/* ═══ STEP 0: Jenis Wajib Pajak ═══ */}
        {step === 0 && (
          <Card title="Langkah 1" subtitle="Pilih Jenis Wajib Pajak">
            <div style={{ display: "grid", gap: 14 }}>
              {([
                { val: "orang_pribadi", label: "Orang Pribadi", desc: "Menggunakan KTP", icon: "👤" },
                { val: "badan_dalam", label: "Badan Dalam Negeri", desc: "PT, CV, Firma, Yayasan, dll — Menggunakan NPWP", icon: "🏢" },
                { val: "badan_luar", label: "Badan Luar Negeri", desc: "Entitas asing — Menggunakan dokumen identitas luar negeri", icon: "🌐" },
              ] as { val: WPType; label: string; desc: string; icon: string }[]).map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => set({ wpType: opt.val, selectedCode: null, skbStatus: null, skbNomor: "", skbChecked: false, corStatus: null, selectedCountry: null })}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "18px 20px",
                    border: state.wpType === opt.val ? "2px solid #c8102e" : "2px solid #e0e0e0",
                    borderRadius: 8,
                    background: state.wpType === opt.val ? "#fff5f5" : "#fff",
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{opt.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: state.wpType === opt.val ? "#c8102e" : "#0f0f0f" }}>{opt.label}</div>
                    <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{opt.desc}</div>
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    border: state.wpType === opt.val ? "2px solid #c8102e" : "2px solid #ccc",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {state.wpType === opt.val && <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#c8102e" }} />}
                  </div>
                </button>
              ))}
            </div>
            <NextButton disabled={!canNext()} onClick={() => setStep(1)} />
          </Card>
        )}

        {/* ═══ STEP 1: Kode Objek Pajak ═══ */}
        {step === 1 && (
          <Card title="Langkah 2" subtitle="Pilih Kode Objek Pajak & Jenis Transaksi">
            {/* Search */}
            <div style={{ position: "relative", marginBottom: 14 }}>
              <input
                type="text"
                placeholder="Cari kode objek pajak atau jenis transaksi... (contoh: katering, sewa tanah, konstruksi)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "12px 12px 12px 40px",
                  border: "2px solid #e0e0e0", borderRadius: 6,
                  fontSize: 14, fontFamily: "'Nunito', sans-serif",
                  outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#c8102e"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e0e0e0"; }}
              />
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#aaa" }}>🔍</span>
            </div>

            {/* Tax code list */}
            <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid #e0e0e0", borderRadius: 6 }}>
              {filteredCodes.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "#aaa" }}>
                  Tidak ada kode objek pajak yang ditemukan
                </div>
              ) : (
                filteredCodes.map((tc) => (
                  <button
                    key={tc.kode}
                    onClick={() => set({ selectedCode: tc, skbStatus: null, skbNomor: "", skbChecked: false, skbValid: false })}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      padding: "12px 16px",
                      width: "100%", border: "none",
                      borderBottom: "1px solid #f0f0f0",
                      background: state.selectedCode?.kode === tc.kode ? "#fff5f5" : "#fff",
                      cursor: "pointer", textAlign: "left",
                      transition: "background 0.1s",
                    }}
                  >
                    <div style={{ flexShrink: 0, paddingTop: 2 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%",
                        border: state.selectedCode?.kode === tc.kode ? "2px solid #c8102e" : "2px solid #ccc",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {state.selectedCode?.kode === tc.kode && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#c8102e" }} />}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 3 }}>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
                          color: "#c8102e", background: "#fff0f0", padding: "1px 6px", borderRadius: 4,
                        }}>{tc.kode}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: "#fff",
                          background: tc.pph === "PPH 21" ? "#1a1a1a" : tc.pph === "PPH 23" ? "#c8102e" : tc.pph === "PPH 4 ayat 2" ? "#8b0000" : "#333",
                          padding: "1px 6px", borderRadius: 4,
                        }}>{getPPHLabel(tc.pph)}</span>
                        {tc.tarif !== null && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#c8102e" }}>
                            Tarif: {tc.tarif}%
                          </span>
                        )}
                        {tc.tipe === "pasal17" && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#c8102e" }}>
                            Tarif: Progresif Pasal 17
                          </span>
                        )}
                        {tc.tipe === "p3b" && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#c8102e" }}>
                            Tarif: 20% / P3B
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: "#333", lineHeight: 1.4 }}>{tc.nama}</div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* SKB section (Orang Pribadi & Badan Dalam Negeri) */}
            {state.selectedCode && state.wpType !== "badan_luar" && (
              <div style={{ marginTop: 20, padding: 16, background: "#f9f9f9", borderRadius: 8, border: "1px solid #e0e0e0" }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>Surat Keterangan Bebas (SKB)</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {(["tidak", "ada"] as SKBStatus[]).map((opt) => (
                    <button
                      key={opt as string}
                      onClick={() => set({ skbStatus: opt, skbNomor: "", skbChecked: false, skbValid: false })}
                      style={{
                        flex: 1, padding: "10px 16px",
                        border: state.skbStatus === opt ? "2px solid #c8102e" : "2px solid #e0e0e0",
                        borderRadius: 6, background: state.skbStatus === opt ? "#fff5f5" : "#fff",
                        cursor: "pointer", fontWeight: 700, fontSize: 13,
                        color: state.skbStatus === opt ? "#c8102e" : "#666",
                      }}
                    >
                      {opt === "ada" ? "✅ Ada SKB" : "❌ Tidak Ada SKB"}
                    </button>
                  ))}
                </div>
                {state.skbStatus === "ada" && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>
                      Nomor Surat Keterangan Bebas
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Contoh: SKB-2024-001"
                        value={state.skbNomor}
                        onChange={(e) => set({ skbNomor: e.target.value, skbChecked: false, skbValid: false })}
                        style={{
                          flex: 1, padding: "10px 12px",
                          border: "2px solid #e0e0e0", borderRadius: 6,
                          fontSize: 14, fontFamily: "'Nunito', sans-serif",
                          outline: "none",
                        }}
                      />
                      <button
                        onClick={() => {
                          if (state.skbNomor.trim()) {
                            set({ skbChecked: true, skbValid: true });
                          }
                        }}
                        style={{
                          padding: "10px 18px",
                          background: "#c8102e", color: "#fff",
                          border: "none", borderRadius: 6,
                          fontWeight: 700, fontSize: 13, cursor: "pointer",
                        }}
                      >
                        Cek SKB
                      </button>
                    </div>
                    {state.skbChecked && (
                      <div style={{
                        marginTop: 10, padding: "10px 14px", borderRadius: 6,
                        background: state.skbValid ? "#f0fff4" : "#fff5f5",
                        border: `1px solid ${state.skbValid ? "#86efac" : "#fca5a5"}`,
                        fontSize: 13, fontWeight: 700,
                        color: state.skbValid ? "#166534" : "#991b1b",
                      }}>
                        {state.skbValid
                          ? `✅ SKB ${state.skbNomor} aktif — Tarif otomatis 0%`
                          : "❌ SKB tidak ditemukan atau tidak aktif"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* COR & DGT section (Badan Luar Negeri) */}
            {state.selectedCode && state.wpType === "badan_luar" && (
              <div style={{ marginTop: 20, padding: 16, background: "#f9f9f9", borderRadius: 8, border: "1px solid #e0e0e0" }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>Certificate of Residence (COR) & DGT Form</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {(["tidak", "ada"] as CORStatus[]).map((opt) => (
                    <button
                      key={opt as string}
                      onClick={() => set({ corStatus: opt, selectedCountry: null })}
                      style={{
                        flex: 1, padding: "10px 16px",
                        border: state.corStatus === opt ? "2px solid #c8102e" : "2px solid #e0e0e0",
                        borderRadius: 6, background: state.corStatus === opt ? "#fff5f5" : "#fff",
                        cursor: "pointer", fontWeight: 700, fontSize: 13,
                        color: state.corStatus === opt ? "#c8102e" : "#666",
                      }}
                    >
                      {opt === "ada" ? "✅ Memiliki COR & DGT" : "❌ Tidak Memiliki COR & DGT"}
                    </button>
                  ))}
                </div>
                {state.corStatus === "tidak" && (
                  <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 6, background: "#fff0f0", border: "1px solid #fca5a5", fontSize: 13, fontWeight: 700, color: "#991b1b" }}>
                    🔒 Tarif dikunci 20% (Non P3B)
                  </div>
                )}
                {state.corStatus === "ada" && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>
                      Pilih Negara P3B
                    </label>
                    <select
                      value={state.selectedCountry?.code || ""}
                      onChange={(e) => {
                        const c = P3B_COUNTRIES.find((c) => c.code === e.target.value) || null;
                        set({ selectedCountry: c });
                      }}
                      style={{
                        width: "100%", padding: "10px 12px",
                        border: "2px solid #e0e0e0", borderRadius: 6,
                        fontSize: 14, fontFamily: "'Nunito', sans-serif",
                        background: "#fff", outline: "none",
                      }}
                    >
                      <option value="">-- Pilih Negara --</option>
                      {P3B_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                    {state.selectedCountry && state.selectedCode.p3bType && (
                      <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 6, background: "#f0fff4", border: "1px solid #86efac", fontSize: 13 }}>
                        <strong>Tarif P3B {state.selectedCountry.name}:</strong>
                        <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          {(["INTEREST", "ROYALTIES", "SERVICES", "BRANCH_PROFIT"] as const).map((t) => (
                            <div key={t} style={{
                              padding: "4px 8px", borderRadius: 4,
                              background: state.selectedCode?.p3bType === t ? "#c8102e" : "#f4f4f4",
                              color: state.selectedCode?.p3bType === t ? "#fff" : "#333",
                              fontSize: 12, fontWeight: 600,
                            }}>
                              {t}: {state.selectedCountry![t as keyof P3BCountry]}
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: "#166534" }}>
                          ✅ Tarif berlaku untuk {state.selectedCode.nama}: {state.selectedCountry[state.selectedCode.p3bType as keyof P3BCountry]}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <BackButton onClick={() => setStep(0)} />
              <NextButton disabled={!canNext()} onClick={() => setStep(2)} />
            </div>
          </Card>
        )}

        {/* ═══ STEP 2: DPP ═══ */}
        {step === 2 && (
          <Card title="Langkah 3" subtitle="Dasar Pengenaan Pajak (DPP)">
            <InfoBox>
              <strong>Kode Objek Pajak yang dipilih:</strong>{" "}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#c8102e" }}>{state.selectedCode?.kode}</span>{" "}
              — {state.selectedCode?.nama}
            </InfoBox>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
              <div>
                <label style={{ display: "block", fontWeight: 800, fontSize: 14, marginBottom: 8, color: "#0f0f0f" }}>
                  Nominal Jasa
                  <span style={{ display: "block", fontWeight: 500, fontSize: 12, color: "#888", marginTop: 2 }}>Dipotong pajak</span>
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "#c8102e", fontSize: 14 }}>Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={state.dppJasa}
                    onChange={(e) => set({ dppJasa: formatInput(e.target.value) })}
                    style={{
                      width: "100%", padding: "12px 12px 12px 36px",
                      border: "2px solid #e0e0e0", borderRadius: 6,
                      fontSize: 15, fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600, outline: "none", boxSizing: "border-box",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#c8102e"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#e0e0e0"; }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 800, fontSize: 14, marginBottom: 8, color: "#0f0f0f" }}>
                  Nominal Barang
                  <span style={{ display: "block", fontWeight: 500, fontSize: 12, color: "#888", marginTop: 2 }}>Tidak dipotong pajak</span>
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "#666", fontSize: 14 }}>Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={state.dppBarang}
                    onChange={(e) => set({ dppBarang: formatInput(e.target.value) })}
                    style={{
                      width: "100%", padding: "12px 12px 12px 36px",
                      border: "2px solid #e0e0e0", borderRadius: 6,
                      fontSize: 15, fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600, outline: "none", boxSizing: "border-box",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#c8102e"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#e0e0e0"; }}
                  />
                </div>
              </div>
            </div>
            {(dppJasaNum > 0 || dppBarangNum > 0) && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#f9f9f9", borderRadius: 6, border: "1px solid #e0e0e0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "#888" }}>DPP Jasa</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{formatRupiah(dppJasaNum)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "#888" }}>DPP Barang</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{formatRupiah(dppBarangNum)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, borderTop: "1px solid #e0e0e0", marginTop: 6, paddingTop: 8 }}>
                  <span style={{ fontWeight: 800 }}>Total DPP</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: "#c8102e" }}>{formatRupiah(dppJasaNum + dppBarangNum)}</span>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <BackButton onClick={() => setStep(1)} />
              <NextButton disabled={!canNext()} onClick={() => setStep(3)} />
            </div>
          </Card>
        )}

        {/* ═══ STEP 3: PPN ═══ */}
        {step === 3 && (
          <Card title="Langkah 4" subtitle="Pajak Pertambahan Nilai (PPN)">
            <InfoBox>
              Apakah transaksi ini dikenakan PPN?
            </InfoBox>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {(["tidak", "ada"] as PPNStatus[]).map((opt) => (
                <button
                  key={opt as string}
                  onClick={() => set({ ppnStatus: opt, ppnNominal: "" })}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "16px 20px",
                    border: state.ppnStatus === opt ? "2px solid #c8102e" : "2px solid #e0e0e0",
                    borderRadius: 8, background: state.ppnStatus === opt ? "#fff5f5" : "#fff",
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: state.ppnStatus === opt ? "2px solid #c8102e" : "2px solid #ccc",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {state.ppnStatus === opt && <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#c8102e" }} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: state.ppnStatus === opt ? "#c8102e" : "#0f0f0f" }}>
                      {opt === "ada" ? "Ada PPN" : "Tidak Ada PPN"}
                    </div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      {opt === "ada" ? "Transaksi dikenakan PPN — input nominal PPN" : "Transaksi tidak dikenakan PPN"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {state.ppnStatus === "ada" && (
              <div style={{ marginTop: 16 }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: 14, marginBottom: 8 }}>Nominal PPN</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "#c8102e", fontSize: 14 }}>Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={state.ppnNominal}
                    onChange={(e) => set({ ppnNominal: formatInput(e.target.value) })}
                    style={{
                      width: "100%", padding: "12px 12px 12px 36px",
                      border: "2px solid #e0e0e0", borderRadius: 6,
                      fontSize: 15, fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600, outline: "none", boxSizing: "border-box",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#c8102e"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#e0e0e0"; }}
                  />
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <BackButton onClick={() => setStep(2)} />
              <NextButton disabled={!canNext()} onClick={() => setStep(4)} />
            </div>
          </Card>
        )}

        {/* ═══ STEP 4: PPh Terutang ═══ */}
        {step === 4 && (
          <Card title="Langkah 5" subtitle="Nominal PPh Terutang">
            <div style={{ background: "#c8102e", borderRadius: 10, padding: "24px 28px", color: "#fff", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, marginBottom: 6 }}>PPH TERUTANG</div>
              <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>
                {formatRupiah(pphTerutang)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>{pphNote}</div>
            </div>

            {/* Pasal 17 breakdown */}
            {state.selectedCode?.tipe === "pasal17" && pasal17Breakdown.length > 0 && (
              <div style={{ marginBottom: 16, padding: 16, background: "#f9f9f9", border: "1px solid #e0e0e0", borderRadius: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12, color: "#555" }}>RINCIAN PERHITUNGAN PASAL 17</div>
                <div style={{ fontSize: 13, marginBottom: 10 }}>
                  <span style={{ color: "#888" }}>DPP Jasa: </span>
                  <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatRupiah(dppJasaNum)}</strong>
                  <span style={{ color: "#888", marginLeft: 16 }}>PKP (DPP × 50%): </span>
                  <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatRupiah(dppJasaNum * 0.5)}</strong>
                </div>
                {pasal17Breakdown.map((b, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #eee", fontSize: 13 }}>
                    <span style={{ color: "#555" }}>{b.label} × {b.rate}%</span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#888", fontSize: 11 }}>{formatRupiah(b.amount)}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#c8102e" }}>= {formatRupiah(b.tax)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary rows */}
            <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
              {[
                { label: "DPP Jasa (dipotong pajak)", value: formatRupiah(dppJasaNum) },
                {
                  label: `Tarif ${getPPHLabel(state.selectedCode?.pph || "")}`,
                  value: state.selectedCode?.tipe === "pasal17"
                    ? "Progresif Pasal 17"
                    : `${effectiveTarif ?? 0}%`
                },
                { label: "DPP Barang (tidak dipotong pajak)", value: formatRupiah(dppBarangNum) },
                { label: "PPN", value: state.ppnStatus === "ada" ? formatRupiah(ppnNum) : "Tidak ada" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: i % 2 === 0 ? "#fff" : "#f9f9f9", borderBottom: "1px solid #f0f0f0", fontSize: 14 }}>
                  <span style={{ color: "#666" }}>{row.label}</span>
                  <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#fff0f0", borderTop: "2px solid #c8102e", fontSize: 14, fontWeight: 800 }}>
                <span style={{ color: "#c8102e" }}>PPh Terutang</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#c8102e" }}>{formatRupiah(pphTerutang)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <BackButton onClick={() => setStep(3)} />
              <NextButton disabled={!canNext()} onClick={() => setStep(5)} label="Lihat Hasil Perhitungan" />
            </div>
          </Card>
        )}

        {/* ═══ STEP 5: Hasil Perhitungan ═══ */}
        {step === 5 && (
          <>
            {/* Print area */}
            <div ref={printRef} className="print-area" style={{ background: "#fff", borderRadius: 10, border: "2px solid #e0e0e0", overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              {/* Result header */}
              <div style={{ background: "#1a1a1a", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <img className="print-logo" src={bogaLogo} alt="Boga Group" style={{ width: 54, height: 38, objectFit: "contain", background: "#fff", borderRadius: 5, padding: 4, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#c8102e", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", fontFamily: "'JetBrains Mono', monospace" }}>
                    PERHITUNGAN PAJAK BOGA GROUP
                  </div>
                  <div style={{ color: "#fff", fontSize: 20, fontWeight: 900, marginTop: 4 }}>Hasil Perhitungan PPh</div>
                </div>
                <div style={{ textAlign: "right", color: "#888", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                  {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>

              {/* Detail rows */}
              <div style={{ padding: "0 28px" }}>
                <SectionHeader>Identitas Wajib Pajak & Objek Pajak</SectionHeader>
                <ResultRow label="Jenis Wajib Pajak" value={
                  state.wpType === "orang_pribadi" ? "Orang Pribadi (KTP)" :
                  state.wpType === "badan_dalam" ? "Badan Dalam Negeri (NPWP)" :
                  "Badan Luar Negeri"
                } />
                <ResultRow label="Jenis PPh" value={getPPHLabel(state.selectedCode?.pph || "")} highlight />
                <ResultRow label="Kode Objek Pajak" value={state.selectedCode?.kode || ""} mono />
                <ResultRow label="Nama Objek Pajak" value={state.selectedCode?.nama || ""} />

                {state.wpType !== "badan_luar" && state.skbStatus === "ada" && state.skbChecked && state.skbValid && (
                  <ResultRow label="Surat Keterangan Bebas" value={`SKB ${state.skbNomor} — Aktif (Tarif 0%)`} />
                )}
                {state.wpType === "badan_luar" && state.corStatus === "ada" && state.selectedCountry && (
                  <ResultRow label="Negara P3B" value={state.selectedCountry.name} />
                )}

                <SectionHeader>Dasar Pengenaan Pajak</SectionHeader>
                <ResultRow label="DPP Jasa (dipotong pajak)" value={formatRupiah(dppJasaNum)} mono />
                <ResultRow label="DPP Barang (tidak dipotong pajak)" value={formatRupiah(dppBarangNum)} mono />

                {state.selectedCode?.tipe === "pasal17" && dppJasaNum > 0 && (
                  <>
                    <SectionHeader>Rincian Perhitungan Pasal 17</SectionHeader>
                    <ResultRow label="PKP (DPP Jasa × 50%)" value={formatRupiah(dppJasaNum * 0.5)} mono />
                    {pasal17Breakdown.map((b, i) => (
                      <ResultRow key={i} label={`${b.label} × ${b.rate}%`} value={formatRupiah(b.tax)} mono indent />
                    ))}
                  </>
                )}

                <SectionHeader>Perhitungan Pajak</SectionHeader>
                <ResultRow
                  label={`Tarif ${getPPHLabel(state.selectedCode?.pph || "")}`}
                  value={state.selectedCode?.tipe === "pasal17" ? "Progresif Pasal 17" : `${effectiveTarif ?? 0}%`}
                />
                <ResultRow label="PPh Terutang" value={formatRupiah(pphTerutang)} highlight mono />

                <SectionHeader>Ringkasan Pembayaran ke Vendor</SectionHeader>
                <ResultRow label="DPP Jasa" value={formatRupiah(dppJasaNum)} mono />
                <ResultRow label="DPP Barang" value={formatRupiah(dppBarangNum)} mono />
                <ResultRow label="PPN" value={state.ppnStatus === "ada" ? formatRupiah(ppnNum) : "Rp 0 (Tidak ada PPN)"} mono />
                <ResultRow label="PPh Terutang (Dipotong)" value={`– ${formatRupiah(pphTerutang)}`} mono />
              </div>

              {/* Final amount */}
              <div style={{ margin: "0 28px 28px", background: "#c8102e", borderRadius: 8, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 0 }}>
                <div>
                  <div style={{ color: "#ffcdd5", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>NOMINAL YANG DIBAYARKAN KE VENDOR</div>
                  <div style={{ color: "#fff", fontSize: 28, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>
                    {formatRupiah(nominalVendor)}
                  </div>
                  <div style={{ color: "#ffcdd5", fontSize: 12, marginTop: 4 }}>
                    (Total Tagihan {formatRupiah(totalTagihan)} − PPh {formatRupiah(pphTerutang)})
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "12px 16px", textAlign: "right" }}>
                  <div style={{ color: "#ffcdd5", fontSize: 11, marginBottom: 4 }}>PPh TERUTANG</div>
                  <div style={{ color: "#fff", fontSize: 18, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatRupiah(pphTerutang)}
                  </div>
                </div>
              </div>

              {/* Footer note */}
              <div style={{ borderTop: "1px solid #f0f0f0", padding: "14px 28px", background: "#f9f9f9" }}>
                <div style={{ fontSize: 11, color: "#999", fontStyle: "italic", textAlign: "center" }}>
                  Dokumen ini dibuat oleh sistem Kalkulator Pajak Boga Group. Hasil perhitungan bersifat indikatif dan tidak menggantikan konsultasi perpajakan resmi.
                </div>
              </div>
            </div>

            {/* Save to history */}
            <div className="no-print" style={{ marginTop: 16, padding: "12px 14px", background: historySaved ? "#f0fff4" : "#f9f9f9", border: `1px solid ${historySaved ? "#b7e4c7" : "#e0e0e0"}`, borderRadius: 8 }}>
              {historySaved ? (
                <div style={{ color: "#287a45", fontSize: 13, fontWeight: 800 }}>✓ Perhitungan sudah disimpan ke riwayat.</div>
              ) : (
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: savingHistory ? "wait" : "pointer", fontSize: 13, color: "#444", fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={saveToHistory}
                    onChange={(e) => setSaveToHistory(e.target.checked)}
                    disabled={savingHistory}
                    style={{ width: 17, height: 17, accentColor: "#c8102e", cursor: savingHistory ? "wait" : "pointer" }}
                  />
                  Simpan perhitungan ke riwayat
                </label>
              )}
            </div>

            {/* Action buttons */}
            <div className="no-print" style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
              {saveToHistory && (
                <button
                  onClick={() => void saveCurrentCalculation()}
                  disabled={savingHistory}
                  style={{
                    flex: 1, minWidth: 200,
                    padding: "14px 24px",
                    background: savingHistory ? "#e0e0e0" : "#fff", color: savingHistory ? "#999" : "#c8102e",
                    border: `2px solid ${savingHistory ? "#ccc" : "#c8102e"}`, borderRadius: 8,
                    fontWeight: 800, fontSize: 15, cursor: savingHistory ? "wait" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  {savingHistory ? "⏳ Menyimpan..." : "💾 Simpan ke Riwayat"}
                </button>
              )}
              <button
                onClick={handlePrint}
                style={{
                  flex: 1, minWidth: 200,
                  padding: "14px 24px",
                  background: "#1a1a1a", color: "#fff",
                  border: "2px solid #1a1a1a", borderRadius: 8,
                  fontWeight: 800, fontSize: 15, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                🖨️ Download Hasil Perhitungan (PDF)
              </button>
              <button
                onClick={handleReset}
                style={{
                  flex: 1, minWidth: 200,
                  padding: "14px 24px",
                  background: "#fff", color: "#c8102e",
                  border: "2px solid #c8102e", borderRadius: 8,
                  fontWeight: 800, fontSize: 15, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                🔄 Hitung Ulang / Transaksi Baru
              </button>
            </div>
          </>
        )}
        </>
        )}
      </div>

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HistoryPage({ history, loading, error, onBack, onRefresh }: {
  history: HistoryRecord[];
  loading: boolean;
  error: string;
  onBack: () => void;
  onRefresh: () => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#c8102e", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>RIWAYAT PERHITUNGAN</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#111", marginTop: 4 }}>Perhitungan yang Disimpan</div>
          <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>Hanya perhitungan yang kamu pilih untuk disimpan yang tampil di sini.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onRefresh} style={{ padding: "9px 14px", borderRadius: 7, border: "1px solid #ddd", background: "#fff", color: "#444", fontWeight: 800, cursor: "pointer" }}>↻ Refresh</button>
          <button type="button" onClick={onBack} style={{ padding: "9px 14px", borderRadius: 7, border: "1px solid #c8102e", background: "#fff", color: "#c8102e", fontWeight: 800, cursor: "pointer" }}>← Kalkulator</button>
        </div>
      </div>

      {loading ? (
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, padding: 40, textAlign: "center", color: "#777" }}>Memuat riwayat perhitungan...</div>
      ) : error ? (
        <div style={{ background: "#fff5f5", border: "1px solid #f2b8c0", borderRadius: 10, padding: 20, color: "#a30d26", fontSize: 13 }}>{error}</div>
      ) : history.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, padding: 50, textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#222" }}>Belum ada riwayat</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>Selesaikan perhitungan lalu pilih “Simpan ke Riwayat”.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {history.map((item) => (
            <div key={item.id} style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: "#c8102e", fontWeight: 900, fontSize: 13 }}>{item.pph_type || "PPh"}</span>
                    {item.object_code && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#666", background: "#f4f4f4", padding: "2px 6px", borderRadius: 4 }}>{item.object_code}</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#222", marginTop: 7, lineHeight: 1.4 }}>{item.object_name || "Objek pajak"}</div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 7 }}>{formatHistoryDate(item.created_at)}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>PPh Terutang</div>
                  <div style={{ color: "#c8102e", fontSize: 16, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>{formatRupiah(Number(item.pph_terutang || 0))}</div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 5 }}>Dibayar ke vendor: <strong>{formatRupiah(Number(item.nominal_vendor || 0))}</strong></div>
                </div>
              </div>
              {item.calculation_data && (
                <details style={{ borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>
                  <summary style={{ padding: "10px 18px", cursor: "pointer", color: "#c8102e", fontSize: 12, fontWeight: 800 }}>Lihat detail perhitungan</summary>
                  <div style={{ padding: "0 18px 14px", display: "grid", gap: 0 }}>
                    <HistoryDetailRow label="Jenis Wajib Pajak" value={item.calculation_data.state.wpType === "orang_pribadi" ? "Orang Pribadi (KTP)" : item.calculation_data.state.wpType === "badan_dalam" ? "Badan Dalam Negeri (NPWP)" : "Badan Luar Negeri"} />
                    <HistoryDetailRow label="DPP Jasa" value={formatRupiah(item.calculation_data.dppJasaNum)} />
                    <HistoryDetailRow label="DPP Barang" value={formatRupiah(item.calculation_data.dppBarangNum)} />
                    <HistoryDetailRow label="PPN" value={item.calculation_data.state.ppnStatus === "ada" ? formatRupiah(item.calculation_data.ppnNum) : "Rp 0 (Tidak ada PPN)"} />
                    <HistoryDetailRow label="Nominal Dibayar ke Vendor" value={formatRupiah(item.calculation_data.nominalVendor)} highlight />
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryDetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 0", borderBottom: "1px solid #eee", fontSize: 12 }}>
      <span style={{ color: "#777" }}>{label}</span>
      <span style={{ color: highlight ? "#c8102e" : "#222", fontWeight: 800, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "2px solid #e0e0e0", overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}>
      <div style={{ padding: "16px 24px", borderBottom: "2px solid #f0f0f0", display: "flex", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "#c8102e", letterSpacing: "0.1em", textTransform: "uppercase" }}>{title}</div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#0f0f0f", marginTop: 1 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 14px", background: "#f9f9f9", border: "1px solid #e0e0e0", borderLeft: "3px solid #c8102e", borderRadius: 6, fontSize: 13, color: "#555" }}>
      {children}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", padding: "16px 0 6px", borderBottom: "1px solid #f0f0f0", marginBottom: 0 }}>
      {children}
    </div>
  );
}

function ResultRow({ label, value, highlight, mono, indent }: {
  label: string; value: string; highlight?: boolean; mono?: boolean; indent?: boolean;
}) {
  return (
    <div className="print-result-row" style={{
      display: "grid",
      gridTemplateColumns: "minmax(150px, 32%) minmax(0, 1fr)",
      columnGap: 20,
      alignItems: "start",
      padding: `${indent ? "6px" : "10px"} ${indent ? "8px" : "0"}`,
      borderBottom: "1px solid #f5f5f5",
      background: indent ? "#fafafa" : "transparent",
    }}>
      <span className="print-result-label" style={{
        fontSize: 13,
        color: highlight ? "#c8102e" : "#666",
        fontWeight: highlight ? 800 : 500,
        minWidth: 0,
      }}>{label}</span>
      <span className="print-result-value" style={{
        fontSize: 13,
        fontWeight: highlight ? 800 : 700,
        fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit",
        color: highlight ? "#c8102e" : "#0f0f0f",
        textAlign: "right",
        minWidth: 0,
        whiteSpace: "normal",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
      }}>{value}</span>
    </div>
  );
}

function NextButton({ disabled, onClick, label = "Lanjut →" }: { disabled?: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        flex: 1, padding: "13px 24px",
        background: disabled ? "#e0e0e0" : "#c8102e",
        color: disabled ? "#aaa" : "#fff",
        border: "none", borderRadius: 8,
        fontWeight: 800, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'Nunito', sans-serif", transition: "background 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "13px 20px",
        background: "#fff", color: "#666",
        border: "2px solid #e0e0e0", borderRadius: 8,
        fontWeight: 700, fontSize: 14, cursor: "pointer",
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      ← Kembali
    </button>
  );
}
