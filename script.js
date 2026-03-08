import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyByK9nN4gS9AXK1xj1dxXPSiuHWkyePnhg",
    authDomain: "portfolio-a5492.firebaseapp.com",
    projectId: "portfolio-a5492",
    storageBucket: "portfolio-a5492.firebasestorage.app",
    messagingSenderId: "1005579824655",
    appId: "1:1005579824655:web:1dc463640c5bb713fcbd7a",
    measurementId: "G-1SFVPVNGZM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const IMGBB_API_KEY = "8721f5038be58d2f94d588dbeae3e012";

// Global Helpers
let currentEditId = null;
let currentEditCol = null;

window.addEventListener('DOMContentLoaded', async () => {


    // --- ১. UPLOAD LOGIC (Sobar agey eita rakho) ---
    const addSlideBtn = document.getElementById('addSlideBtn');
    if (addSlideBtn) {
        addSlideBtn.addEventListener('click', async () => {
            const fileInput = document.getElementById('slideFileInput');
            const files = fileInput.files;
            const status = document.getElementById('uploadStatus');

            if (files.length === 0) return alert("Please select an image!");

            // Button Disable koro jate double click na hoy
            addSlideBtn.innerText = "Processing...";
            addSlideBtn.disabled = true;

            for (let i = 0; i < files.length; i++) {
                if (status) {
                    status.classList.remove('hidden');
                    status.innerText = `Uploading ${i + 1} of ${files.length}...`;
                }
                
                const fd = new FormData();
                fd.append("image", files[i]);
                
                try {
                    // API Key-ta direct bosiye dilam error erite
                    const res = await fetch(`https://api.imgbb.com/1/upload?key=8721f5038be58d2f94d588dbeae3e012`, {
                        method: "POST",
                        body: fd
                    });
                    const result = await res.json();
                    
                    if (result.success) {
                        // Firebase-e save (Nishchit koro collection name 'slideshow' thik ache)
                        await addDoc(collection(db, "slideshow"), {
                            url: result.data.url,
                            createdAt: new Date()
                        });
                    }
                } catch (e) {
                    console.error("Upload Error:", e);
                }
            }

            alert("Upload Successful!");
            addSlideBtn.innerText = "Upload to Slideshow";
            addSlideBtn.disabled = false;
            fileInput.value = "";
            if (status) status.classList.add('hidden');
        });
    }

    // --- ২. SLIDESHOW DISPLAY LOGIC (Eita tar niche thakbe) ---
    // ... tomar baki onSnapshot ebong setInterval logic ...



    
    // --- ১. ভিজিটর ট্র্যাকিং ---
    const viewRef = doc(db, "stats", "views");
    try { await setDoc(viewRef, { count: increment(1) }, { merge: true }); } catch (e) {}
    onSnapshot(viewRef, (d) => {
        if (d.exists() && document.getElementById('viewCountDisplay')) {
            document.getElementById('viewCountDisplay').innerText = d.data().count || 0;
        }
    });
    document.getElementById('resetViewBtn').onclick = async () => { if(confirm("Reset views?")) await setDoc(viewRef, { count: 0 }); };

    // --- ২. প্রোফাইল রিয়েলটাইম লোড ---
    onSnapshot(doc(db, "settings", "profile"), (d) => {
        if (d.exists()) {
            const url = d.data().navUrl;
            document.getElementById('navProfilePic').src = url;
            document.getElementById('heroProfilePic').src = url;
        }
    });

    // --- ৩. প্রজেক্ট ডিসপ্লে (With Delete List & Link Fix) ---
    onSnapshot(query(collection(db, "projects"), orderBy("createdAt", "desc")), (snap) => {
        const grid = document.getElementById('projectGrid');
        grid.innerHTML = "";
        let adminListHTML = "";

        snap.forEach(d => {
            const p = d.data();
            let liveLink = p.link.startsWith('http') ? p.link : 'https://' + p.link;

            grid.innerHTML += `
                <div class="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-4 transition-all duration-500 hover:-translate-y-3">
                    <img src="${p.imageUrl}" class="w-full h-64 object-cover rounded-[2rem]">
                    <div class="mt-4 flex justify-between px-2">
                        <span class="text-primary font-bold text-[10px] uppercase">Web Work</span>
                        <a href="${liveLink}" target="_blank" rel="noopener noreferrer" class="text-primary text-[10px] font-bold uppercase underline">Live View</a>
                    </div>
                </div>`;

            adminListHTML += `
                <div class="flex items-center justify-between p-2 bg-black/20 rounded-xl mb-2 border border-white/5">
                    <div class="flex items-center gap-2 text-[10px] text-white/70">
                        <img src="${p.imageUrl}" class="w-8 h-8 rounded object-cover">
                        <span class="truncate w-20">${p.link}</span>
                    </div>
                    <button onclick="deleteDocById('projects', '${d.id}')" class="text-red-500 p-2"><i class="fas fa-trash-alt"></i></button>
                </div>`;
        });

        const adminContainer = document.querySelector('#adminPanel .grid div:first-child'); 
        let listDiv = document.getElementById('projectAdminList');
        if(!listDiv) {
            listDiv = document.createElement('div'); listDiv.id = 'projectAdminList';
            listDiv.className = 'mt-4 max-h-40 overflow-y-auto pr-1';
            adminContainer.appendChild(listDiv);
        }
        listDiv.innerHTML = `<h3 class="text-emerald-400 font-bold uppercase text-[9px] mb-2">Project List</h3>` + adminListHTML;
    });

    // --- ৪. স্কিল ডিসপ্লে (With Image/Icon & Admin Edit/Delete) ---
    onSnapshot(query(collection(db, "skills"), orderBy("createdAt", "asc")), (snap) => {
        const sGrid = document.getElementById('skillGrid');
        const adminSkList = document.getElementById('adminSkillList');
        sGrid.innerHTML = "";
        if(adminSkList) adminSkList.innerHTML = "";

        snap.forEach(d => {
            const s = d.data();
            const isImg = s.icon.startsWith('http');
            const iconHTML = isImg ? `<img src="${s.icon}" class="w-12 h-12 mx-auto mb-3 object-contain">` : `<i class="${s.icon} text-4xl mb-3 text-primary"></i>`;

            sGrid.innerHTML += `
                <div class="group p-8 bg-gray-50 dark:bg-gray-800/20 rounded-[2rem] border border-transparent hover:border-primary/20 transition text-center">
                    ${iconHTML} <p class="text-[10px] font-bold uppercase">${s.name}</p>
                </div>`;

            if(adminSkList) {
                adminSkList.innerHTML += `
                    <div class="flex justify-between items-center p-2 bg-black/20 rounded-lg mb-2">
                        <span class="text-[10px] truncate w-24 text-white">${s.name}</span>
                        <div class="flex gap-2">
                            <button onclick="editDocById('skills', '${d.id}', ${JSON.stringify(s).replace(/"/g, '&quot;')})" class="text-blue-400"><i class="fas fa-edit"></i></button>
                            <button onclick="deleteDocById('skills', '${d.id}')" class="text-red-500"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`;
            }
        });
    });

    // --- ৫. সার্ভিস ডিসপ্লে (With Admin Edit/Delete) ---
    onSnapshot(query(collection(db, "services"), orderBy("createdAt", "desc")), (snap) => {
        const sGrid = document.getElementById('serviceGrid');
        const adminSList = document.getElementById('adminServiceList');
        sGrid.innerHTML = "";
        if(adminSList) adminSList.innerHTML = "";

        snap.forEach(d => {
            const s = d.data();
            sGrid.innerHTML += `
                <div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 hover:bg-primary/5 transition">
                    <i class="fas fa-layer-group text-primary text-2xl mb-4"></i>
                    <h4 class="text-xl font-bold mb-4 uppercase">${s.title}</h4>
                    <p class="text-gray-400 text-sm line-clamp-3 mb-4">${s.description}</p>
                    <button onclick="alert('${s.description}')" class="text-primary text-[10px] font-bold uppercase hover:underline">Read More</button>
                </div>`;

            if(adminSList) {
                adminSList.innerHTML += `
                    <div class="flex justify-between items-center p-2 bg-black/20 rounded-lg mb-2">
                        <span class="text-[10px] truncate w-24 text-white">${s.title}</span>
                        <div class="flex gap-2">
                            <button onclick="editDocById('services', '${d.id}', ${JSON.stringify(s).replace(/"/g, '&quot;')})" class="text-blue-400"><i class="fas fa-edit"></i></button>
                            <button onclick="deleteDocById('services', '${d.id}')" class="text-red-500"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`;
            }
        });
    });

    // --- ৬. মেসেজ হ্যান্ডলিং ---
    document.getElementById('contactForm').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('senderName').value;
        const email = document.getElementById('senderEmail').value;
        const msg = document.getElementById('senderMsg').value;
        await addDoc(collection(db, "messages"), { name, email, msg, date: new Date().toLocaleString(), createdAt: new Date() });
        alert("Message sent!"); e.target.reset();
    };

    onSnapshot(query(collection(db, "messages"), orderBy("createdAt", "desc")), (snap) => {
        const mList = document.getElementById('messageList');
        mList.innerHTML = "";
        snap.forEach(d => {
            const m = d.data();
            mList.innerHTML += `
                <div class="p-4 bg-white/5 rounded-xl border border-white/10 text-[11px] mb-2">
                    <div class="flex justify-between text-primary font-bold"><span>${m.name}</span><button onclick="deleteDocById('messages', '${d.id}')" class="text-red-500"><i class="fas fa-times"></i></button></div>
                    <p class="text-white/50">${m.email}</p><p class="text-white italic bg-black/30 p-2 rounded-lg mt-2">${m.msg}</p>
                </div>`;
        });
    });

    // --- ৭. অ্যাডমিন লজিক ---
    let clicks = 0;
    document.getElementById('adminTriggerName').onclick = () => {
        clicks++;
        if (clicks === 5) {
            if (prompt("Admin Key:") === "nadim123") {
                document.getElementById('adminPanel').classList.remove('hidden');
            }
            clicks = 0;
        }
    };
    document.getElementById('closeAdmin').onclick = () => document.getElementById('adminPanel').classList.add('hidden');

    window.deleteDocById = async (col, id) => { if(confirm("Are you sure?")) await deleteDoc(doc(db, col, id)); };

    window.editDocById = (col, id, data) => {
        currentEditId = id; currentEditCol = col;
        if (col === 'services') {
            document.getElementById('serviceTitleInput').value = data.title;
            document.getElementById('serviceDescInput').value = data.description;
            document.getElementById('uploadServiceBtn').innerText = "Update Service";
        } else if (col === 'skills') {
            document.getElementById('skillNameInput').value = data.name;
            document.getElementById('skillIconInput').value = data.icon;
            document.getElementById('addSkillBtn').innerText = "Update Skill";
        }
    };

    // --- ৮. আপলোড ফাংশনস ---
    async function uploadToImgBB(file) {
        const fd = new FormData(); fd.append("image", file);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
        const data = await res.json(); return data.success ? data.data.url : null;
    }

    document.getElementById('uploadProjectBtn').onclick = async () => {
        const f = document.getElementById('projImgInput').files[0];
        const l = document.getElementById('projLinkInput').value;
        if(!f || !l) return alert("Missing info!");
        document.getElementById('uploadProjectBtn').innerText = "Working...";
        const url = await uploadToImgBB(f);
        if(url) await addDoc(collection(db, "projects"), { imageUrl: url, link: l, createdAt: new Date() });
        alert("Done!"); location.reload();
    };

    document.getElementById('uploadServiceBtn').onclick = async () => {
        const t = document.getElementById('serviceTitleInput').value, d = document.getElementById('serviceDescInput').value;
        if (currentEditId && currentEditCol === 'services') {
            await setDoc(doc(db, "services", currentEditId), { title: t, description: d }, { merge: true });
            currentEditId = null; document.getElementById('uploadServiceBtn').innerText = "Save Service";
        } else { await addDoc(collection(db, "services"), { title: t, description: d, createdAt: new Date() }); }
        document.getElementById('serviceTitleInput').value = ""; document.getElementById('serviceDescInput').value = "";
    };

    document.getElementById('addSkillBtn').onclick = async () => {
        const n = document.getElementById('skillNameInput').value, i = document.getElementById('skillIconInput').value;
        if (currentEditId && currentEditCol === 'skills') {
            await setDoc(doc(db, "skills", currentEditId), { name: n, icon: i }, { merge: true });
            currentEditId = null; document.getElementById('addSkillBtn').innerText = "Save Skill";
        } else { await addDoc(collection(db, "skills"), { name: n, icon: i, createdAt: new Date() }); }
        document.getElementById('skillNameInput').value = ""; document.getElementById('skillIconInput').value = "";
    };

    document.getElementById('updateProfileBtn').onclick = async () => {
        const f = document.getElementById('profilePicInput').files[0]; if(!f) return alert("Select file!");
        const url = await uploadToImgBB(f); if(url) await setDoc(doc(db, "settings", "profile"), { navUrl: url });
        location.reload();
    };

    document.getElementById('darkModeToggle').onclick = () => document.documentElement.classList.toggle('dark');
});
// --- Hero Slideshow Final Logic (Real-time & Sync) ---
let slideshowData = [];
let currentSlideIndex = 0;
const slideElements = document.querySelectorAll('.slideshow-item');

// ১. Firebase theke data load ebong slide-e set kora
// Eita automatically update hobe jkhon-i tumi notun chobi upload korbe
onSnapshot(query(collection(db, "slideshow"), orderBy("createdAt", "asc")), (snap) => {
    slideshowData = [];
    const adminSlideList = document.getElementById('adminSlideList');
    if(adminSlideList) adminSlideList.innerHTML = "";

    snap.forEach(d => {
        const s = d.data();
        slideshowData.push(s.url);

        // Admin list-e image dekhano
        if(adminSlideList) {
            adminSlideList.innerHTML += `
                <div class="flex items-center justify-between p-2 bg-black/20 rounded-xl mb-2 border border-white/5">
                    <img src="${s.url}" class="w-10 h-6 rounded object-cover border border-white/10">
                    <button onclick="deleteDocById('slideshow', '${d.id}')" class="text-red-500 p-2"><i class="fas fa-trash-alt"></i></button>
                </div>`;
        }
    });

    // Jodi database-e chobi thake, tobe prothom-ta background-e bosiye dao
    if (slideshowData.length > 0 && slideElements.length > 0) {
        // Shob layer hide kore prothom-ta show kora
        slideElements.forEach(el => el.style.opacity = '0');
        slideElements[0].style.backgroundImage = `url('${slideshowData[0]}')`;
        slideElements[0].style.opacity = '1';
    }
});

// ২. Slideshow Rotation Function
function startSlideshow() {
    if (slideshowData.length < 2 || slideElements.length === 0) return;

    // Purono layer opacity 0 kora
    slideElements.forEach(el => el.style.opacity = '0');

    // Next Index calculation
    currentSlideIndex = (currentSlideIndex + 1) % slideshowData.length;
    
    // 3-ti layer-er moddhe rotation
    const layerToUse = slideElements[currentSlideIndex % slideElements.length];
    
    layerToUse.style.backgroundImage = `url('${slideshowData[currentSlideIndex]}')`;
    layerToUse.style.opacity = '1';
}

// Protite 5 second por por slide change hobe
setInterval(startSlideshow, 5000);
// --- Resume Image Management (Final Fixed) ---

const uploadResumeImgBtn = document.getElementById('uploadResumeImgBtn');
const deleteResumeBtn = document.getElementById('deleteResumeBtn');

// ১. Upload Logic
if (uploadResumeImgBtn) {
    uploadResumeImgBtn.onclick = async () => {
        const fileInput = document.getElementById('resumeImageInput');
        const file = fileInput.files[0];

        if (!file) return alert("Please select your resume image!");

        uploadResumeImgBtn.innerText = "Uploading...";
        uploadResumeImgBtn.disabled = true;

        const fd = new FormData();
        fd.append("image", file);

        try {
            // ImgBB API call
            const res = await fetch(`https://api.imgbb.com/1/upload?key=8721f5038be58d2f94d588dbeae3e012`, {
                method: "POST",
                body: fd
            });
            const result = await res.json();

            if (result.success) {
                // Firestore-e link update kora
                await setDoc(doc(db, "settings", "resume"), {
                    url: result.data.url,
                    updatedAt: new Date()
                });
                alert("Resume uploaded successfully!");
                fileInput.value = ""; // Input clear koro
            }
        } catch (e) {
            console.error("Upload error:", e);
            alert("Upload failed, check console.");
        } finally {
            uploadResumeImgBtn.innerText = "Upload Resume";
            uploadResumeImgBtn.disabled = false;
        }
    };
}

// ২. Delete Logic (Fixed)
if (deleteResumeBtn) {
    deleteResumeBtn.onclick = async () => {
        if (!confirm("Delete current resume?")) return;
        
        try {
            await deleteDoc(doc(db, "settings", "resume"));
            alert("Resume deleted!");
        } catch (e) {
            console.error("Delete error:", e);
        }
    };
}

// ৩. Sync with UI (Header & Preview)
onSnapshot(doc(db, "settings", "resume"), (docSnap) => {
    const resumeBtn = document.getElementById('resumeViewBtn');
    const previewArea = document.getElementById('resumePreviewArea');
    const previewImg = document.getElementById('currentResumeImg');

    if (docSnap.exists()) {
        const url = docSnap.data().url;
        if (resumeBtn) {
            resumeBtn.href = url;
            resumeBtn.classList.remove('hidden');
        }
        if (previewArea && previewImg) {
            previewArea.classList.remove('hidden');
            previewImg.src = url;
        }
    } else {
        if (resumeBtn) resumeBtn.classList.add('hidden');
        if (previewArea) previewArea.classList.add('hidden');
    }
});
// --- Floating WhatsApp Button Control ---
const createFloatingWA = () => {
    const waBtn = document.createElement('a');
    waBtn.href = "https://wa.me/01850085185"; // Tomar number bosao
    waBtn.target = "_blank";
    waBtn.className = "fixed bottom-6 right-6 w-14 h-14 bg-[#25D366] text-white rounded-full shadow-2xl flex items-center justify-center text-2xl z-50 hover:scale-110 transition-transform duration-300 animate-bounce";
    waBtn.innerHTML = '<i class="fab fa-whatsapp"></i>';
    document.body.appendChild(waBtn);
};

createFloatingWA();