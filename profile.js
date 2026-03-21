// profile.js
import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profilePic = document.getElementById("profilePic");
  const changePicBtn = document.getElementById("changePicBtn");
  const profilePicInput = document.getElementById("profilePicInput");

  // APRI FILE PICKER
  changePicBtn.addEventListener("click", () => {
    profilePicInput.click();
  });

  // CARICA FOTO
  profilePicInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filePath = `profile/${user.id}.jpg`;

    // UPLOAD SU SUPABASE
    const { error: uploadError } = await supabase.storage
      .from("instalbum")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error(uploadError);
      alert("Errore nel caricamento della foto");
      return;
    }

    // OTTIENI URL PUBBLICO
    const { data: urlData } = supabase.storage
      .from("instalbum")
      .getPublicUrl(filePath);

    // MOSTRA LA FOTO
    profilePic.src = urlData.publicUrl;
  });
});

let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  setupMenu();
  setupProfilePic();
  setupBio();
  setupRicordiUI();
  setupHighlightsUI();

  await loadProfile();
  await loadRicordi();
  await loadHighlights();
});

// MENU
function setupMenu() {
  const menuButton = document.getElementById("menuButton");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const logoutBtn = document.getElementById("logoutBtn");

  menuButton.addEventListener("click", () => {
    dropdownMenu.classList.toggle("hidden");
  });

  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });

  document.addEventListener("click", (e) => {
    if (!menuButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.add("hidden");
    }
  });
}

// FOTO PROFILO
function setupProfilePic() {
  const changePicBtn = document.getElementById("changePicBtn");
  const profilePicInput = document.getElementById("profilePicInput");

  changePicBtn.addEventListener("click", () => {
    profilePicInput.click();
  });

  profilePicInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;

    // CORRETTO: usa la cartella profile/
    const fileName = `profile/${currentUser.id}-${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from("instalbum")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("Errore upload avatar:", error);
      return;
    }

    const publicUrl = supabase.storage
      .from("instalbum")
      .getPublicUrl(fileName).data.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", currentUser.id);

    if (updateError) {
      console.error("Errore update profilo:", updateError);
      return;
    }

    document.getElementById("profilePic").src = publicUrl;
  });
}

// BIO
function setupBio() {
  const saveBioBtn = document.getElementById("saveBioBtn");
  const bioInput = document.getElementById("bioInput");

  saveBioBtn.addEventListener("click", async () => {
    if (!currentUser) return;
    const bio = bioInput.value.trim();

    const { error } = await supabase
      .from("profiles")
      .update({ bio })
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("Errore salvataggio bio:", error);
      return;
    }
  });
}

async function loadProfile() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", currentUser.id)
    .single();

  if (error) {
    console.error("Errore caricamento profilo:", error);
    return;
  }

  if (data.avatar_url) {
    document.getElementById("profilePic").src = data.avatar_url;
  }
  if (data.bio) {
    document.getElementById("bioInput").value = data.bio;
  }
}

// RICORDI (POST)
function setupRicordiUI() {
  const addRicordoBtn = document.getElementById("addRicordoBtn");
  const newRicordoModal = document.getElementById("newRicordoModal");
  const closeNewRicordoModal = document.getElementById("closeNewRicordoModal");
  const publishBtn = document.getElementById("modalPublishBtn");

  addRicordoBtn.addEventListener("click", () => {
    newRicordoModal.classList.remove("hidden");
  });

  closeNewRicordoModal.addEventListener("click", () => {
    newRicordoModal.classList.add("hidden");
  });

  newRicordoModal
    .querySelector(".modal-backdrop")
    .addEventListener("click", () => {
      newRicordoModal.classList.add("hidden");
    });

  publishBtn.addEventListener("click", createRicordo);

  // chiusura modal ricordo visualizzazione
  const ricordoModal = document.getElementById("ricordoModal");
  const closeRicordoModal = document.getElementById("closeRicordoModal");
  const ricordoBackdrop = ricordoModal.querySelector(".modal-backdrop");

  closeRicordoModal.addEventListener("click", () => {
    ricordoModal.classList.add("hidden");
  });

  ricordoBackdrop.addEventListener("click", () => {
    ricordoModal.classList.add("hidden");
  });
}

async function createRicordo() {
  if (!currentUser) return;

  const coverInput = document.getElementById("modalCoverInput");
  const photosInput = document.getElementById("modalPhotosInput");
  const captionInput = document.getElementById("modalCaption");

  const coverFile = coverInput.files[0];
  const photoFiles = Array.from(photosInput.files);
  const caption = captionInput.value.trim();

  if (!coverFile) {
    alert("Seleziona una copertina");
    return;
  }

  const coverPath = `ricordi/${currentUser.id}/cover-${Date.now()}.jpg`;
  const { error: coverError } = await supabase.storage
    .from("instalbum")
    .upload(coverPath, coverFile, {
      cacheControl: "3600",
      upsert: true,
    });

  if (coverError) {
    console.error("Errore upload copertina:", coverError);
    return;
  }

  const coverUrl = supabase.storage
    .from("instalbum")
    .getPublicUrl(coverPath).data.publicUrl;

  const { data: ricordoData, error: ricordoError } = await supabase
    .from("ricordi")
    .insert({
      user_id: currentUser.id,
      caption,
      cover_image: coverUrl,
    })
    .select("*")
    .single();

  if (ricordoError) {
    console.error("Errore inserimento ricordo:", ricordoError);
    return;
  }

  for (const file of photoFiles) {
    const photoPath = `ricordi/${currentUser.id}/${ricordoData.id}-${Date.now()}-${file.name}`;
    const { error: photoError } = await supabase.storage
      .from("instalbum")
      .upload(photoPath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (photoError) {
      console.error("Errore upload foto interna:", photoError);
      continue;
    }

    const photoUrl = supabase.storage
      .from("instalbum")
      .getPublicUrl(photoPath).data.publicUrl;

    const { error: insertPhotoError } = await supabase
      .from("ricordi_photos")
      .insert({
        ricordo_id: ricordoData.id,
        image_path: photoUrl,
      });

    if (insertPhotoError) {
      console.error("Errore inserimento ricordo_photo:", insertPhotoError);
    }
  }

  coverInput.value = "";
  photosInput.value = "";
  captionInput.value = "";

  document.getElementById("newRicordoModal").classList.add("hidden");
  await loadRicordi();
}

async function loadRicordi() {
  if (!currentUser) return;

  const { data: ricordi, error } = await supabase
    .from("ricordi")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Errore caricamento ricordi:", error);
    return;
  }

  const grid = document.getElementById("ricordiGrid");
  grid.innerHTML = "";

  for (const ricordo of ricordi) {
    const { data: photos, error: photosError } = await supabase
      .from("ricordi_photos")
      .select("*")
      .eq("ricordo_id", ricordo.id);

    if (photosError) {
      console.error("Errore caricamento foto ricordo:", photosError);
      continue;
    }

    const card = document.createElement("div");
    card.classList.add("ricordo-card-grid");

    card.innerHTML = `
      <img class="ricordo-cover-grid" src="${ricordo.cover_image}" alt="Ricordo" />
    `;

    card.addEventListener("click", () => {
      openRicordoModal(ricordo, photos || []);
    });

    grid.appendChild(card);
  }
}

function openRicordoModal(ricordo, photos) {
  const modal = document.getElementById("ricordoModal");
  const captionEl = document.getElementById("ricordoModalCaption");
  const dateEl = document.getElementById("ricordoModalDate");
  const carousel = document.getElementById("ricordoModalCarousel");

  captionEl.textContent = ricordo.caption || "";
  dateEl.textContent = new Date(ricordo.created_at).toLocaleString();

  carousel.innerHTML = "";
  if (!photos || photos.length === 0) {
    const img = document.createElement("img");
    img.classList.add("carousel-image");
    img.src = ricordo.cover_image;
    carousel.appendChild(img);
  } else {
    photos.forEach((p) => {
      const img = document.createElement("img");
      img.classList.add("carousel-image");
      img.src = p.image_path;
      carousel.appendChild(img);
    });
  }

  modal.classList.remove("hidden");
}

// HIGHLIGHTS (FRIENDS)
function setupHighlightsUI() {
  const newHighlightBtn = document.getElementById("newHighlightBtn");
  const newHighlightModal = document.getElementById("newHighlightModal");
  const closeNewHighlightModal = document.getElementById(
    "closeNewHighlightModal"
  );
  const createHighlightBtn = document.getElementById("createHighlightBtn");

  newHighlightBtn.addEventListener("click", () => {
    newHighlightModal.classList.remove("hidden");
  });

  closeNewHighlightModal.addEventListener("click", () => {
    newHighlightModal.classList.add("hidden");
  });

  newHighlightModal
    .querySelector(".modal-backdrop")
    .addEventListener("click", () => {
      newHighlightModal.classList.add("hidden");
    });

  createHighlightBtn.addEventListener("click", createHighlight);

  const highlightModal = document.getElementById("highlightModal");
  const closeHighlightModal = document.getElementById("closeHighlightModal");
  const highlightBackdrop = highlightModal.querySelector(".modal-backdrop");

  closeHighlightModal.addEventListener("click", () => {
    highlightModal.classList.add("hidden");
  });

  highlightBackdrop.addEventListener("click", () => {
    highlightModal.classList.add("hidden");
  });
}

async function createHighlight() {
  if (!currentUser) return;

  const titleInput = document.getElementById("highlightTitleInput");
  const coverInput = document.getElementById("highlightCoverInput");
  const photosInput = document.getElementById("highlightPhotosInput");

  const title = titleInput.value.trim();
  const coverFile = coverInput.files[0];
  const photoFiles = Array.from(photosInput.files);

  if (!title || !coverFile) {
    alert("Nome e copertina sono obbligatori");
    return;
  }

  const coverPath = `highlights/${currentUser.id}/cover-${Date.now()}.jpg`;
  const { error: coverError } = await supabase.storage
    .from("instalbum")
    .upload(coverPath, coverFile, {
      cacheControl: "3600",
      upsert: true,
    });

  if (coverError) {
    console.error("Errore upload copertina highlight:", coverError);
    return;
  }

  const coverUrl = supabase.storage
    .from("instalbum")
    .getPublicUrl(coverPath).data.publicUrl;

  const { data: highlightData, error: highlightError } = await supabase
    .from("highlights")
    .insert({
      user_id: currentUser.id,
      title,
      cover_image: coverUrl,
    })
    .select("*")
    .single();

  if (highlightError) {
    console.error("Errore inserimento highlight:", highlightError);
    return;
  }

  for (const file of photoFiles) {
    // CORRETTO: usa la cartella highlights_photos/
    const photoPath = `highlights_photos/${currentUser.id}/${highlightData.id}-${Date.now()}-${file.name}`;
    const { error: photoError } = await supabase.storage
      .from("instalbum")
      .upload(photoPath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (photoError) {
      console.error("Errore upload foto highlight:", photoError);
      continue;
    }

    const photoUrl = supabase.storage
      .from("instalbum")
      .getPublicUrl(photoPath).data.publicUrl;

    const { error: insertPhotoError } = await supabase
      .from("highlight_photos")
      .insert({
        highlight_id: highlightData.id,
        image_path: photoUrl,
      });

    if (insertPhotoError) {
      console.error("Errore inserimento highlight_photo:", insertPhotoError);
    }
  }

  titleInput.value = "";
  coverInput.value = "";
  photosInput.value = "";

  document.getElementById("newHighlightModal").classList.add("hidden");
  await loadHighlights();
}

async function loadHighlights() {
  if (!currentUser) return;

  const { data: highlights, error } = await supabase
    .from("highlights")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Errore caricamento highlights:", error);
    return;
  }

  const row = document.getElementById("highlightsRow");
  row.innerHTML = `
    <div class="highlight-item new-highlight" id="newHighlightBtn">
      <div class="highlight-circle">+</div>
      <span class="highlight-label">Nuovo</span>
    </div>
  `;

  setupHighlightsUI();

  for (const h of highlights) {
    const item = document.createElement("div");
    item.classList.add("highlight-item");

    item.innerHTML = `
      <div class="highlight-circle">
        <img src="${h.cover_image}" alt="${h.title}" />
      </div>
      <span class="highlight-label">${h.title}</span>
    `;

    item.addEventListener("click", () => {
      openHighlightModal(h);
    });

    row.appendChild(item);
  }
}

async function openHighlightModal(highlight) {
  const modal = document.getElementById("highlightModal");
  const titleEl = document.getElementById("highlightModalTitle");
  const carousel = document.getElementById("highlightModalCarousel");

  titleEl.textContent = highlight.title;

  const { data: photos, error } = await supabase
    .from("highlight_photos")
    .select("*")
    .eq("highlight_id", highlight.id);

  if (error) {
    console.error("Errore caricamento foto highlight:", error);
    return;
  }

  carousel.innerHTML = "";
  (photos || []).forEach((p) => {
    const img = document.createElement("img");
    img.classList.add("carousel-image");
    img.src = p.image_path;
    carousel.appendChild(img);
  });

  modal.classList.remove("hidden");
}
