# Kasa Defteri

Çoklu para birimi destekli, tarih bazlı gelir/gider takip uygulaması. HTML, CSS ve vanilla JavaScript ile yazıldı; veriler tarayıcı `localStorage`'ında saklanır.

## Özellikler

- Gelir/gider kaydı: açıklama, tutar, para birimi (₺ TRY, € EUR, $ USD), tarih, isteğe bağlı kategori, ödeme yöntemi (Nakit / Kredi Kartı)
- Para birimleri birbirine çevrilmez, her biri kendi toplamıyla gösterilir
- Tarih filtreleri: Bugün, Dün, Bu Hafta, Bu Ay, Özel Tarih, Tarih Aralığı
- Özet kartları: Toplam Gelir, Toplam Gider, Net Bakiye (para birimine göre ayrı ayrı); Gelir ve Gider kartlarında nakit/kredi kartı kırılımı da gösterilir
- Ödeme yöntemi bilgisi olmayan eski kayıtlar "Belirtilmemiş" olarak gösterilir, geriye dönük veri değiştirilmez
- Hafta/Ay/Tarih Aralığı filtrelerinde günlük Gelir/Gider/İkram çubuk grafiği; Gelir/Gider çubuklarına tıklayınca nakit/kredi kartı kırılımı gösterilir
- Kayıt ekleme, düzenleme, silme

## Lokal Olarak Açma

```bash
python3 -m http.server 8000
```

Ardından `http://localhost:8000/kasa-defteri/index.html` adresine gidin.

(Doğrudan `index.html` dosyasını çift tıklayarak da açabilirsiniz.)

## Deploy Etme

Bu klasör `maligunes.github.io` reposunun bir alt dizinidir. Repo `main` branşına push edildiğinde GitHub Pages üzerinden `https://maligunes.github.io/kasa-defteri/` adresinde otomatik olarak yayınlanır.
