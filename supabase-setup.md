# إعدادات Supabase المطلوبة لرفع الملفات

## 1. إنشاء Storage Bucket
```sql
-- في Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true);
```

## 2. إعداد RLS Policies
```sql
-- السماح برفع الملفات للمستخدمين المسجلين
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.role() = 'authenticated');

-- السماح بقراءة الملفات للجميع
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT USING (bucket_id = 'chat-media');

-- السماح بحذف الملفات لأصحابها
CREATE POLICY "Allow users to delete own files" ON storage.objects
FOR DELETE USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 3. تفعيل RLS
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

## 4. إعدادات CORS (في Supabase Dashboard)
- انتقل إلى Settings > API
- في CORS origins أضف:
  - `*` (للتطوير)
  - أو domain التطبيق المحدد (للإنتاج)

## 5. فحص الـ API Key
- تأكد من أن الـ anon key صحيح
- تأكد من أن الـ service_role key (إذا كان مطلوب) صحيح

## 6. اختبار الرفع
```javascript
// اختبار بسيط لرفع ملف
const testUpload = async () => {
  const { data, error } = await supabase.storage
    .from('chat-media')
    .upload('test.txt', new Blob(['Hello World'], { type: 'text/plain' }));
  
  console.log('Upload result:', { data, error });
};
```
