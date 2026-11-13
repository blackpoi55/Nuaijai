# เหนื่อยใจ Pass Shop

เว็บขายพาสของแมพเหนื่อยใจ มีระบบสมัครสมาชิก เติมแต้มด้วยซองอั่งเปา TrueMoney ซื้อพาสด้วยแต้ม แล้วได้โค้ดไปกรอกในเกม

- ราคาบาท = ปัดขึ้น(ราคา Robux เต็มของทั้งตะกร้า ÷ 6) อัตรานี้แก้ได้ในหลังบ้าน
- 1 บาท = 1 แต้ม ระบบเก็บเป็นสตางค์ เพราะซองอั่งเปามีเศษสตางค์ได้
- ในตะกร้าเลือกได้ว่าจะรวมทุกชิ้นเป็นโค้ดเดียว หรือแยกโค้ดทีละชิ้นไว้แจกเพื่อน
- โค้ดยาว 12 ตัว (`XXXX-XXXX-XXXX`) ใช้ได้ครั้งเดียว ไม่ผูกกับไอดี
- ถ้าผู้เล่นมีพาสในโค้ดอยู่แล้ว เกมจะไม่รับโค้ด และโค้ดยังไม่ถูกใช้

เทคโนโลยี: Next.js 15, Neon (Postgres), Drizzle, Tailwind 4 ขึ้นบน Vercel

## รันในเครื่อง

```bash
npm install
npm run dev
```

ถ้า `DATABASE_URL` ใน `.env.local` ว่างอยู่ จะใช้ฐานข้อมูลในเครื่อง (โฟลเดอร์ `.pglite`) และสร้างตารางให้อัตโนมัติ
ส่วน `TRUEMONEY_MOCK=1` คือโหมดทดสอบ ใช้ซองชื่อ `TEST100xxxxxx` แทนซองจริงได้ (100 บาท) โหมดนี้ปิดเองตอนขึ้นจริง

## ขึ้นใช้งานจริง

1. **Neon**: สร้างโปรเจกต์ (region Singapore) แล้วคัดลอก connection string แบบ *pooled*
2. **สร้างตาราง**: ใส่ connection string ใน `.env.local` ที่ `DATABASE_URL=...` แล้วรัน `npm run db:migrate`
3. **Vercel**: import repo นี้ แล้วใส่ Environment Variables:
   | ชื่อ | ค่า |
   |---|---|
   | `DATABASE_URL` | connection string ของ Neon |
   | `TRUEMONEY_PHONE` | เบอร์ TrueMoney ที่รับเงิน |
   | `ADMIN_USERNAMES` | ชื่อผู้ใช้ที่เป็นแอดมิน (คั่นด้วย `,`) |
   | `GAME_API_KEY` | รหัสลับยาวๆ ต้องตรงกับ Secret ในเกม |
   | `TRUEMONEY_API_BASE` | (ไม่บังคับ) พร็อกซีในไทย ถ้า TrueMoney บล็อกเซิร์ฟเวอร์ต่างประเทศ |
4. สมัครสมาชิกบนเว็บด้วยชื่อที่ใส่ไว้ใน `ADMIN_USERNAMES` แล้วจะเข้าหลังบ้านที่ `/admin` ได้

## ต่อกับเกม

สคริปต์ `ServerScriptService.Persistence.CodeRelay` ในเกม เรียก `POST /api/game/redeem` บนเว็บ

1. ใน CodeRelay ตั้ง `R.URL = "https://<โดเมนเว็บ>/api/game/redeem"`
2. Creator Dashboard → เกม → **Secrets**: เพิ่ม secret ชื่อ `nh_code_key` ใส่ค่าเดียวกับ `GAME_API_KEY`
   ถ้าจะทดสอบใน Studio ให้ใส่ใน Game Settings → Security → Secrets ด้วย
3. Game Settings → Security → เปิด **Allow HTTP Requests**
4. File → Publish

## หมายเหตุ

- การรับซองอั่งเปาใช้ API ที่ไม่เป็นทางการของ TrueMoney ถ้าเขาเปลี่ยนระบบ ต้องแก้ไฟล์ `src/lib/truemoney.ts`
- ถ้าซองล้มเหลวแต่เงินเข้าแอปจริง แอดมินกด "เติมให้" ได้ที่หน้า `/admin/topups`
- เพิ่มพาสใหม่ได้ที่หน้า `/admin/products` โดย "รหัสพาสในเกม" ต้องตรงกับ `id` ใน `Config.Passes`
