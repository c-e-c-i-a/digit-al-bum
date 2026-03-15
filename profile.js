import { supabase } from "./supabaseClient.js";

/* ---------------------------
   ELEMENTI
----------------------------*/

const coverBtn = document.getElementById("coverBtn");
const coverInput = document.getElementById("coverInput");

const photosBtn = document.getElementById("photosBtn");
const photosInput = document.getElementById("photosInput");

const ricordoCaption = document.getElementById("ricordoCaption");
const publishRicordoBtn = document.getElementById("publishRicordoBtn");

const ricordiContainer = document.getElementById("ricordiContainer");

// FOTO PROFILO
const changePicBtn = document.getElementById("changePicBtn");
const profilePicInput = document.getElementById("profilePicInput");
const profilePic = document.getElementById("profilePic");

// BIO
const bioInput = document.getElementById("bioInput");
const saveBioBtn = document.getElementById("saveBioBtn");

// MENU TRE PUNTINI
const menuButton = document.getElementById("menuButton");
const dropdownMenu = document.getElementById("dropdownMenu");

menuButton.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownMenu.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!menuButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownMenu.classList.add("hidden");
  }
});

let selectedCover = null;
let selectedPhotos = [];

/* ---------------------------
   FOTO PROFILO – CAMBIO FOTO
----------------------------*/

changePicBtn.addEventListener("click", () => {
  profilePicInput.click();
});

profilePicInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session.user;

  const fileName = `profile/${user.id}/profile_${Date.now()}.jpg`;

  await supabase.storage.from("instalbum").upload(fileName, file);

  const { data: urlData } = supabase.storage
    .from("instalbum")
    .getPublicUrl(fileName);

  const publicUrl = urlData.publicUrl;

  await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("user_id", user.id);

  profilePic.src = publicUrl;
});

/* ---------------------------
   FOTO PROFILO – CARICAMENTO
----------------------------*/

async function loadProfilePic() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("user_id", user.id)
    .single();

  if (profile && profile.avatar_url) {
    profilePic.src = profile.avatar_url;
  }
}

/* ---------------------------
   BIO – SALVATAGGIO
----------------------------*/

saveBioBtn.addEventListener("click", async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session.user;

  await supabase
    .from("profiles")
    .update({ bio: bioInput.value })
    .eq("user_id", user.id);

  alert("Bio salvata ✨");
});

/* ---------------------------
   BIO – CARICAMENTO
----------------------------*/

async function loadBio() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("bio")
    .eq("user_id", user.id)
    .single();

  if (profile && profile.bio) {
    bioInput.value = profile.bio;
  }
}

/* ---------------------------
   RICORDI – COPERTINA
----------------------------*/

coverBtn.addEventListener("click", () => coverInput.click());
coverInput.addEventListener("change", (e) => {
  selectedCover = e.target.files[0];
});

/* ---------------------------
   RICORDI – FOTO INTERNE
----------------------------*/

photosBtn.addEventListener("click", () => photosInput.click());
photosInput.addEventListener("change", (e) => {
  selectedPhotos = Array.from(e.target.files);
});

/* ---------------------------
   PUBBLICA RICORDO
----------------------------*/

publishRicordoBtn.addEventListener("click", async () => {
  if (!selectedCover) return alert("Scegli una copertina");
  if (!ricordoCaption.value.trim()) return alert("Scrivi un ricordo");

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session.user;

  const coverName = `ricordi/${user.id}/cover_${Date.now()}.jpg`;
  await supabase.storage.from("instalbum").upload(coverName, selectedCover);

  const { data: coverUrl } = supabase.storage
    .from("instalbum")
    .getPublicUrl(coverName);

  const { data: ricordo } = await supabase
    .from("ricordi")
    .insert({
      user_id: user.id,
      caption: ricordoCaption.value,
      cover_image: coverUrl.publicUrl
    })
    .select()
    .single();

  for (const photo of selectedPhotos) {
    const fileName = `ricordi/${user.id}/${Date.now()}_${photo.name}`;
    await supabase.storage.from("instalbum").upload(fileName, photo);

    const { data: photoUrl } = supabase.storage
      .from("instalbum")
      .getPublicUrl(fileName);

    await supabase.from("ricordi_photos").insert({
      ricordo_id: ricordo.id,
      image_path: photoUrl.publicUrl
    });
  }

  selectedCover = null;
  selectedPhotos = [];
  ricordoCaption.value = "";

  loadRicordi();
});

/* ---------------------------
   CARICA RICORDI
----------------------------*/

async function loadRicordi() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session.user;

  const { data: ricordi } = await supabase
    .from("ricordi")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  ricordiContainer.innerHTML = "";

  if (!ricordi) return;

  for (const ricordo of ricordi) {
    const { data: photos } = await supabase
      .from("ricordi_photos")
      .select("*")
      .eq("ricordo_id", ricordo.id);

    const card = document.createElement("div");
    card.className = "ricordo-card";

    let carouselHTML = "";
    if (photos && photos.length > 0) {
      carouselHTML = `
        <div class="carousel-container">
          <button class="carousel-btn left">‹</button>
          <div class="carousel-track">
            ${photos
              .map(
                (p) =>
                  `<img class="carousel-image" src="${p.image_path}" />`
              )
              .join("")}
          </div>
          <button class="carousel-btn right">›</button>
        </div>
      `;
    }

    card.innerHTML = `
      <img class="ricordo-cover" src="${ricordo.cover_image}" />
      <div class="ricordo-caption-text">${ricordo.caption}</div>
      <div class="ricordo-date">${new Date(
        ricordo.created_at
      ).toLocaleString()}</div>
      ${carouselHTML}
    `;

    ricordiContainer.appendChild(card);

    if (photos && photos.length > 0) {
      const track = card.querySelector(".carousel-track");
      const leftBtn = card.querySelector(".carousel-btn.left");
      const rightBtn = card.querySelector(".carousel-btn.right");

      let index = 0;

      leftBtn.onclick = () => {
        index = Math.max(index - 1, 0);
        track.style.transform = `translateX(-${index * 100}%)`;
      };

      rightBtn.onclick = () => {
        index = Math.min(index + 1, photos.length - 1);
        track.style.transform = `translateX(-${index * 100}%)`;
      };
    }
  }
}

/* ---------------------------
   GALLERIA FOTO – ELEMENTI
----------------------------*/

const addPhotoBtn = document.getElementById("addPhotoBtn");
const photoInput = document.getElementById("photoInput");
const photoGrid = document.getElementById("photoGrid");

/* ---------------------------
   GALLERIA FOTO – UPLOAD
----------------------------*/

addPhotoBtn.addEventListener("click", () => {
  photoInput.click();
});

photoInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session.user;

  const fileName = `gallery/${user.id}/photo_${Date.now()}.jpg`;

  await supabase.storage.from("instalbum").upload(fileName, file);

  const { data: urlData } = supabase.storage
    .from("instalbum")
    .getPublicUrl(fileName);

  const publicUrl = urlData.publicUrl;

  await supabase
    .from("gallery_photos")
    .insert({
      user_id: user.id,
      image_url: publicUrl
    });

  await loadGallery();
});

/* ---------------------------
   GALLERIA FOTO – CARICAMENTO
----------------------------*/

async function loadGallery() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session.user;

  const { data: photos } = await supabase
    .from("gallery_photos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  photoGrid.innerHTML = "";

  if (!photos) return;

  photos.forEach((p) => {
    const wrapper = document.createElement("div");
    wrapper.className = "photo-wrapper";

    const img = document.createElement("img");
    img.src = p.image_url;

    img.addEventListener("click", () => {
      openImageModal(p.image_url);
    });

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "🗑️";

    del.addEventListener("click", async (e) => {
      e.stopPropagation();

      await supabase
        .from("gallery_photos")
        .delete()
        .eq("id", p.id);

      const path = p.image_url.split("/storage/v1/object/public/instalbum/")[1];
      if (path) {
        await supabase.storage.from("instalbum").remove([path]);
      }

      wrapper.remove();
    });

    wrapper.appendChild(img);
    wrapper.appendChild(del);
    photoGrid.appendChild(wrapper);
  });
}

/* ---------------------------
   ZOOM FOTO – MODAL
----------------------------*/

const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const closeModalBtn = document.getElementById("closeModalBtn");

function openImageModal(url) {
  modalImage.src = url;
  imageModal.classList.remove("hidden");
}

function closeImageModal() {
  imageModal.classList.add("hidden");
  modalImage.src = "";
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", closeImageModal);
}

imageModal.addEventListener("click", (e) => {
  if (e.target === imageModal) {
    closeImageModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeImageModal();
  }
});

/* ---------------------------
   AVVIO
----------------------------*/

loadProfilePic();
loadBio();
loadRicordi();
loadGallery();
