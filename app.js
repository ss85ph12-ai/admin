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
const showAddModalBtnSecondary = document.getElementById('show-add-modal-btn-secondary');
const quickAddBtn = document.getElementById('quick-add-btn');
const viewSchoolsBtn = document.getElementById('view-schools-btn');
const schoolsSearch = document.getElementById('schools-search');
const schoolsCount = document.getElementById('schools-count');
const connectionState = document.getElementById('connection-state');
const todayDate = document.getElementById('today-date');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const dashboardTabs = document.querySelectorAll('.dashboard-tab[data-tab]');
const overviewPanel = document.getElementById('overview-panel');
const schoolsPanel = document.getElementById('schools-panel');

let currentEditId = null; // لتتبع ما إذا كنا نضيف أو نعدل مدرسة
let schoolsCache = [];

function initializeTilt(elements) {
    if (window.VanillaTilt) {
        window.VanillaTilt.init(elements, { max: 7, speed: 650, glare: true, 'max-glare': 0.08 });
    }
}

function showToast(title, icon = 'success') {
    if (window.Swal) {
        return window.Swal.fire({ toast: true, position: 'top-start', title, icon, showConfirmButton: false, timer: 2200, timerProgressBar: true });
    }
}

function showMessage(title, text, icon = 'info') {
    if (window.Swal) return window.Swal.fire({ title, text, icon, confirmButtonText: 'حسناً', confirmButtonColor: '#4f46e5' });
    alert(text || title);
}

function switchDashboardTab(tabName) {
    const showOverview = tabName === 'overview';
    overviewPanel.classList.toggle('hidden', !showOverview);
    overviewPanel.classList.toggle('active', showOverview);
    schoolsPanel.classList.toggle('hidden', showOverview);
    schoolsPanel.classList.toggle('active', !showOverview);
    dashboardTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
}

function openAddSchoolModal() {
    currentEditId = null;
    schoolLinkInput.value = '';
    schoolNameInput.value = '';
    document.getElementById('modal-title').innerText = 'إضافة مدرسة جديدة';
    schoolModal.classList.remove('hidden');
    setTimeout(() => schoolNameInput.focus(), 100);
}

todayDate.textContent = new Intl.DateTimeFormat('ar-IQ', { day: 'numeric', month: 'short' }).format(new Date());
initializeTilt(document.querySelectorAll('[data-tilt]'));

// 1. نظام المصادقة (Google Login)
loginBtn.addEventListener('click', async () => {
    loginBtn.classList.add('flipping'); // حركة انقلاب الزر
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("خطأ في تسجيل الدخول", error);
        loginBtn.classList.remove('flipping');
        showMessage('تعذر تسجيل الدخول', 'تأكد من اختيار البريد الرسمي المسموح للنظام ثم حاول مرة أخرى.', 'error');
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
        userName.textContent = user.displayName || 'سرمد سعدي';
        userEmail.textContent = user.email || 'حساب الإدارة';
        switchDashboardTab('overview');
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
    connectionState.textContent = 'جاري الاتصال';
    schoolsContainer.innerHTML = `<div class="skeleton-wrap" aria-label="جاري تحميل المدارس">
        <span class="skeleton-card"></span><span class="skeleton-card"></span><span class="skeleton-card"></span>
    </div>`;
    try {
        const querySnapshot = await getDocs(collection(db, "schools"));
        schoolsCache = querySnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        schoolsCount.textContent = schoolsCache.length.toLocaleString('ar-IQ');
        connectionState.textContent = 'متصل';
        renderSchools(schoolsCache);
    } catch (error) {
        console.error('خطأ في تحميل المدارس', error);
        connectionState.textContent = 'تعذر الاتصال';
        schoolsCount.textContent = '—';
        const permissionDenied = error?.code === 'permission-denied';
        schoolsContainer.innerHTML = `<div class="error-state">
            <div><i class="fas fa-triangle-exclamation"></i><h3>${permissionDenied ? 'هذا البريد غير مخوّل' : 'تعذر تحميل المدارس'}</h3>
            <p>${permissionDenied ? 'سجّل الخروج ثم ادخل بالبريد الرسمي للنظام.' : 'تحقق من الإنترنت ثم أعد المحاولة.'}</p></div>
        </div>`;
        const retryButton = document.createElement('button');
        retryButton.className = 'btn btn-primary';
        retryButton.innerHTML = '<i class="fas fa-rotate"></i> إعادة المحاولة';
        retryButton.addEventListener('click', loadSchools);
        schoolsContainer.querySelector('.error-state > div').appendChild(retryButton);
    }
}

function renderSchools(schools) {
    schoolsContainer.innerHTML = '';
    if (!schools.length) {
        schoolsContainer.innerHTML = '<div class="empty-state"><div><i class="fas fa-school-circle-xmark"></i><h3>لا توجد مدارس مطابقة</h3><p>أضف مدرسة جديدة أو غيّر عبارة البحث.</p></div></div>';
        return;
    }
    schools.forEach(school => createSchoolCard(school.id, school.name, school.url));
}

function createSchoolCard(id, name, url) {
    const card = document.createElement('div');
    card.className = 'school-card depth-card';
    card.innerHTML = `<div class="school-card-head">
        <span class="school-card-icon"><i class="fas fa-school"></i></span>
        <div><h3></h3><p class="school-card-url"></p></div>
    </div>`;
    card.querySelector('h3').textContent = name;
    try {
        card.querySelector('.school-card-url').textContent = new URL(url).hostname;
    } catch {
        card.querySelector('.school-card-url').textContent = url;
    }
    
    // الزر الكبير لفتح المدرسة
    const openBtn = document.createElement('button');
    openBtn.className = 'btn btn-primary btn-open';
    openBtn.innerHTML = '<i class="fas fa-arrow-up-left-from-circle"></i><span>فتح النظام</span>';
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
    initializeTilt(card);
}

// 3. التحكم بالنوافذ المنبثقة وحفظ البيانات
showAddModalBtn.onclick = openAddSchoolModal;
showAddModalBtnSecondary.onclick = openAddSchoolModal;
quickAddBtn.onclick = openAddSchoolModal;
viewSchoolsBtn.onclick = () => switchDashboardTab('schools');
dashboardTabs.forEach(tab => tab.addEventListener('click', () => switchDashboardTab(tab.dataset.tab)));
schoolsSearch.addEventListener('input', () => {
    const query = schoolsSearch.value.trim().toLocaleLowerCase('ar');
    renderSchools(schoolsCache.filter(school => (school.name || '').toLocaleLowerCase('ar').includes(query)));
});

closeModalBtn.onclick = () => schoolModal.classList.add('hidden');
schoolModal.addEventListener('click', event => {
    if (event.target === schoolModal) schoolModal.classList.add('hidden');
});

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
    
    if (!name || !url) return showMessage('الحقول غير مكتملة', 'اكتب اسم المدرسة ورابط النظام أولاً.', 'warning');
    
    // إضافة بروتوكول إذا نسي المستخدم
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    try {
        saveSchoolBtn.disabled = true;
        saveSchoolBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        if (currentEditId) {
            // تحديث
            await updateDoc(doc(db, "schools", currentEditId), { name, url });
        } else {
            // إضافة جديدة
            await addDoc(collection(db, "schools"), { name, url });
        }
        schoolModal.classList.add('hidden');
        saveSchoolBtn.innerHTML = `<i class="fas fa-save"></i> حفظ`;
        saveSchoolBtn.disabled = false;
        await loadSchools();
        switchDashboardTab('schools');
        showToast(currentEditId ? 'تم تحديث المدرسة' : 'تمت إضافة المدرسة');
    } catch (error) {
        console.error("خطأ:", error);
        showMessage('تعذر الحفظ', 'حدث خطأ أثناء حفظ بيانات المدرسة. حاول مرة أخرى.', 'error');
        saveSchoolBtn.innerHTML = `<i class="fas fa-save"></i> حفظ`;
        saveSchoolBtn.disabled = false;
    }
};

async function deleteSchool(id) {
    const confirmed = window.Swal
        ? (await window.Swal.fire({ title: 'حذف المدرسة؟', text: 'سيُحذف رابط المدرسة من لوحة الأدمن فقط.', icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم، احذف', cancelButtonText: 'إلغاء', confirmButtonColor: '#ef4444' })).isConfirmed
        : confirm('هل أنت متأكد من حذف هذه المدرسة؟');
    if (confirmed) {
        try {
            await deleteDoc(doc(db, "schools", id));
            await loadSchools();
            showToast('تم حذف المدرسة');
        } catch (error) {
            console.error('خطأ في حذف المدرسة', error);
            showMessage('تعذر الحذف', 'لم نتمكن من حذف المدرسة الآن.', 'error');
        }
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
