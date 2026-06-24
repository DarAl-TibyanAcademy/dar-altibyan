// الطريقة 1: Google TTS (رابط مباشر - الأقوى)
function testMethod1(text) {
    console.log("Testing Method 1: Google TTS");
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=${encodeURIComponent(text)}`;
    new Audio(url).play().catch(e => console.log("Method 1 Failed:", e));
}

// الطريقة 2: Web Speech API (المتطور)
function testMethod2(text) {
    console.log("Testing Method 2: Web Speech API");
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA';
    window.speechSynthesis.speak(u);
}

// الطريقة 3: ResponsiveVoice (المكتبة الخارجية)
function testMethod3(text) {
    console.log("Testing Method 3: ResponsiveVoice");
    if (typeof responsiveVoice !== "undefined") {
        responsiveVoice.speak(text, "Arabic Male");
    } else {
        alert("ResponsiveVoice not loaded!");
    }
}
