// استيراد خدمات Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// إعدادات Firebase الخاصة بك
const firebaseConfig = {
    apiKey: "AIzaSyDc3EBvWp-dOzwJGuCC6A-uvogr4J_w-SA",
    authDomain: "admin-e4516.firebaseapp.com",
    projectId: "admin-e4516",
    storageBucket: "admin-e4516.firebasestorage.app",
    messagingSenderId: "409032812777",
    appId: "1:409032812777:web:c6b6733a38b63ddab56878"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// متغيرات DOM
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const iframeScreen = document.getElementById('iframe-screen');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const schoolsContainer = document.getElementById('schools-container');
const schoolModal = document.getElementById('school-modal');
const schoolLinkInput = document.getElementById('school-link');
const schoolNameInput = document.getElementById('school-name');
const saveSchoolBtn = document.getElementById('save-school-btn');
const showAddModalBtn = document.getElementById('show-add-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const schoolIframe = document.getElementById('school-iframe');
const closeIframeBtn = document.getElementById('close-iframe-btn');
const currentSchoolTitle = document.getElementById('current-school-title');

let currentEditId = null; // لتتبع ما إذا كنا نضيف أو نعدل مدرسة

// 1. نظام المصادقة (Google Login)
loginBtn.addEventListener('click', async () => {
    loginBtn.classList.add('flipping'); // حركة انقلاب الزر
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("خطأ في تسجيل الدخول", error);
        loginBtn.classList.remove('flipping');
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        // تم تسجيل الدخول
        loginScreen.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');
        loadSchools();
    } else {
        // لم يتم تسجيل الدخول
        loginScreen.classList.remove('hidden');
        dashboardScreen.classList.add('hidden');
        iframeScreen.classList.add('hidden');
        loginBtn.classList.remove('flipping');
    }
});

// 2. إدارة المدارس (Firestore)
async function loadSchools() {
    schoolsContainer.innerHTML = 'جاري التحميل...';
    const querySnapshot = await getDocs(collection(db, "schools"));
    schoolsContainer.innerHTML = '';
    
    querySnapshot.forEach((doc) => {
        const school = doc.data();
        createSchoolCard(doc.id, school.name, school.url);
    });
}

function createSchoolCard(id, name, url) {
    const card = document.createElement('div');
    card.className = 'school-card 3d-box';
    
    // الزر الكبير لفتح المدرسة
    const openBtn = document.createElement('button');
    openBtn.className = 'btn btn-primary btn-open';
    openBtn.innerHTML = `<i class="fas fa-school"></i> ${name}`;
    openBtn.onclick = () => openSchool(name, url);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary';
    editBtn.innerHTML = `<i class="fas fa-edit"></i> تعديل`;
    editBtn.onclick = () => openEditModal(id, name, url);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.innerHTML = `<i class="fas fa-trash"></i> حذف`;
    deleteBtn.onclick = () => deleteSchool(id);

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    card.appendChild(openBtn);
    card.appendChild(actionsDiv);
    
    schoolsContainer.appendChild(card);
}

// 3. التحكم بالنوافذ المنبثقة وحفظ البيانات
showAddModalBtn.onclick = () => {
    currentEditId = null;
    schoolLinkInput.value = '';
    schoolNameInput.value = '';
    document.getElementById('modal-title').innerText = "إضافة مدرسة جديدة";
    schoolModal.classList.remove('hidden');
};

closeModalBtn.onclick = () => schoolModal.classList.add('hidden');

function openEditModal(id, name, url) {
    currentEditId = id;
    schoolNameInput.value = name;
    schoolLinkInput.value = url;
    document.getElementById('modal-title').innerText = "تعديل المدرسة";
    schoolModal.classList.remove('hidden');
}

saveSchoolBtn.onclick = async () => {
    const name = schoolNameInput.value.trim();
    let url = schoolLinkInput.value.trim();
    
    if (!name || !url) return alert("يرجى تعبئة جميع الحقول");
    
    // إضافة بروتوكول إذا نسي المستخدم
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    try {
        saveSchoolBtn.innerText = "جاري الحفظ...";
        if (currentEditId) {
            // تحديث
            await updateDoc(doc(db, "schools", currentEditId), { name, url });
        } else {
            // إضافة جديدة
            await addDoc(collection(db, "schools"), { name, url });
        }
        schoolModal.classList.add('hidden');
        saveSchoolBtn.innerHTML = `<i class="fas fa-save"></i> حفظ`;
        loadSchools();
    } catch (error) {
        console.error("خطأ:", error);
        alert("حدث خطأ أثناء الحفظ");
        saveSchoolBtn.innerHTML = `<i class="fas fa-save"></i> حفظ`;
    }
};

async function deleteSchool(id) {
    if (confirm("هل أنت متأكد من حذف هذه المدرسة؟")) {
        await deleteDoc(doc(db, "schools", id));
        loadSchools();
    }
}

// 4. فتح الرابط داخل النظام الداخلي المظلم (Iframe)
function openSchool(name, url) {
    currentSchoolTitle.innerText = name;
    schoolIframe.src = url;
    dashboardScreen.classList.add('hidden');
    iframeScreen.classList.remove('hidden');
}

closeIframeBtn.onclick = () => {
    schoolIframe.src = ""; // إيقاف التحميل
    iframeScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
};

// 5. إعدادات PWA وشاشة التثبيت
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker Registered'))
      .catch(err => console.log('Service Worker Error', err));
}

let deferredPrompt;
const installModal = document.getElementById('install-modal');
const installBtn = document.getElementById('install-btn');
const closeInstallBtn = document.getElementById('close-install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // إظهار نافذة التثبيت المخصصة بعد ثانيتين
    setTimeout(() => installModal.classList.remove('hidden'), 2000);
});

installBtn.addEventListener('click', async () => {
    installModal.classList.add('hidden');
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response: ${outcome}`);
        deferredPrompt = null;
    }
});

closeInstallBtn.addEventListener('click', () => {
    installModal.classList.add('hidden');
});
