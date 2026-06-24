function testMethod1(text) {
    console.log("تجربة الأندرويد المحسنة");
    
    // 1. إنشاء عنصر صوتي
    const audio = new Audio();
    
    // 2. ربطه برابط جوجل (يعامل كملف mp3 وليس توليد نصي)
    audio.src = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=${encodeURIComponent(text)}`;
    
    // 3. الخدعة: تحميل الملف مسبقاً ثم تشغيله فوراً
    audio.load();
    
    // 4. التشغيل مع إضافة "تفاعل وهمي"
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
        playPromise.then(_ => {
            console.log("تم التشغيل بنجاح!");
        }).catch(error => {
            console.error("المتصفح لا يزال يحظر الصوت، تأكد من الضغط على زر ابدأ الآن");
            alert("يرجى الضغط على شاشة البداية لتفعيل الصوت");
        });
    }
}
