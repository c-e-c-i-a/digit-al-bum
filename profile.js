// profile.js
import { supabase } from "./supabaseClient.js";

let currentUser = null;
let currentRicordoInModal = null;
let currentHighlightInModal = null;

/* ============================================================
   BLOCCO 1 — Upload diretto avatar
============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const profilePic = document.getElementById("profilePic");
  const changePicBtn = document.getElementById("changePicBtn");
  const profilePicInput = document.getElementById("profilePicInput");

  changePicBtn.addEventListener("click", () => profilePicInput.click());

  profilePicInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filePath = `profile/${user.id}.jpg`;

    const { error } = await supabase.storage
      .from("instalbum")
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.error(error);
      alert("Errore nel caricamento della foto");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("instalbum")
      .getPublicUrl(filePath);

    profilePic.src = urlData.publicUrl;
  });
});

/* ============================================================
   BLOCCO 2 — Inizializzazione
============================================================ */
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

/* ============================================================
   BLOCCO 3 — Menu
============================================================ */
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

/* ============================================================
   BLOCCO 4 — Foto profilo
============================================================ */
function setupProfilePic() {
  const changePicBtn = document.getElementById("changePicBtn");
  const profilePicInput = document.getElementById("profilePicInput");

  changePicBtn.addEventListener("click", () => profilePicInput.click());

  profilePicInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;

    const fileName = `profile/${currentUser.id}-${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from("instalbum")
      .upload(fileName, file, { upsert: true });

    if (error) {
      console.error("Errore upload avatar:", error);
      return;
    }

    const publicUrl = supabase.storage
      .from("instalbum")
      .getPublicUrl(fileName).data.publicUrl;

    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", currentUser.id);

    document.getElementById("profilePic").src = publicUrl;
  });
}

/* ============================================================
   BLOCCO 5 — Bio
============================================================ */
function setupBio() {
  const saveBioBtn = document.getElementById("saveBioBtn");
  const bioInput = document.getElementById("bioInput");

  saveBioBtn.addEventListener("click", async () => {
    if (!currentUser) return;

    const bio = bioInput.value.trim();

    await supabase
      .from("profiles")
      .update({ bio })
      .eq("user_id", currentUser.id);
  });
}

async function loadProfile() {
  if (!currentUser) return;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", currentUser.id)
    .single();

  if (data.avatar_url) document.getElementById("profilePic").src = data.avatar_url;
  if (data.bio) document.getElementById("bioInput").value = data.bio;
}

/* ============================================================
   BLOCCO 6 — Ricordi (UI + Creazione + Modal + Menu)
============================================================ */
function setupRicordiUI() {
  const addRicordoBtn = document.getElementById("addRicordoBtn");
  const newRicordoModal = document.getElementById("newRicordoModal");
  const closeNewRicordoModal = document.getElementById("closeNewRicordoModal");
  const publishBtn = document.getElementById("modalPublishBtn");

  addRicordoBtn.onclick = () => newRicordoModal.classList.remove("hidden");
  closeNewRicordoModal.onclick = () => newRicordoModal.classList.add("hidden");
  newRicordoModal.querySelector(".modal-backdrop").onclick = () =>
    newRicordoModal.classList.add("hidden");

  publishBtn.onclick = createRicordo;

  const ricordoModal = document.getElementById("ricordoModal");
  const closeRicordoModal = document.getElementById("closeRicordoModal");

  closeRicordoModal.onclick = () => ricordoModal.classList.add("hidden");
  ricordoModal.querySelector(".modal-backdrop").onclick = () =>
    ricordoModal.classList.add("hidden");
}

async function createRicordo() {
  if (!currentUser) return;

  const coverInput = document.getElementById("modalCoverInput");
  const photosInput = document.getElementById("modalPhotosInput");
  const captionInput = document.getElementById("modalCaption");

  const coverFile = coverInput.files[0];
  const caption = captionInput.value.trim();
  const photoFiles = Array.from(photosInput.files);

  if (!coverFile) return alert("Seleziona una copertina");

  const coverPath = `ricordi/${currentUser.id}/cover-${Date.now()}.jpg`;
  await supabase.storage.from("instalbum").upload(coverPath, coverFile, { upsert: true });

  const coverUrl = supabase.storage.from("instalbum").getPublicUrl(coverPath).data.publicUrl;

  const { data: ricordoData } = await supabase
    .from("ricordi")
    .insert({
      user_id: currentUser.id,
      caption,
      cover_image: coverUrl,
    })
    .select("*")
    .single();

  for (const f of photoFiles) {
    const photoPath = `ricordi/${currentUser.id}/${ricordoData.id}-${Date.now()}-${f.name}`;
    await supabase.storage.from("instalbum").upload(photoPath, f, { upsert: true });

    const photoUrl = supabase.storage.from("instalbum").getPublicUrl(photoPath).data.publicUrl;

    await supabase.from("ricordi_photos").insert({
      ricordo_id: ricordoData.id,
      image_path: photoUrl,
    });
  }

  coverInput.value = "";
  photosInput.value = "";
  captionInput.value = "";

  document.getElementById("newRicordoModal").classList.add("hidden");
  await loadRicordi();
}

async function loadRicordi() {
  const { data: ricordi } = await supabase
    .from("ricordi")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  const grid = document.getElementById("ricordiGrid");
  grid.innerHTML = "";

  for (const ricordo of ricordi) {
    const { data: photos } = await supabase
      .from("ricordi_photos")
      .select("*")
      .eq("ricordo_id", ricordo.id);

    const card = document.createElement("div");
    card.classList.add("ricordo-card-grid");

    card.innerHTML = `
      <img class="ricordo-cover-grid" src="${ricordo.cover_image}" />
    `;

    card.onclick = () => openRicordoModal(ricordo, photos || []);
    grid.appendChild(card);
  }
}

/* ============================================================
   BLOCCO 7 — Funzioni modifica ricordo
============================================================ */
async function deleteRicordo(id) {
  await supabase.from("ricordi_photos").delete().eq("ricordo_id", id);
  await supabase.from("ricordi").delete().eq("id", id);
  await loadRicordi();
  document.getElementById("ricordoModal").classList.add("hidden");
}

async function changeRicordoCover(ricordo) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const path = `ricordi/${currentUser.id}/cover-${Date.now()}.jpg`;
    await supabase.storage.from("instalbum").upload(path, file, { upsert: true });

    const url = supabase.storage.from("instalbum").getPublicUrl(path).data.publicUrl;

    await supabase.from("ricordi").update({ cover_image: url }).eq("id", ricordo.id);

    const { data: photos } = await supabase
      .from("ricordi_photos")
      .select("*")
      .eq("ricordo_id", ricordo.id);

    openRicordoModal(ricordo, photos || []);
    await loadRicordi();
  };

  input.click();
}

async function addRicordoPhotos(ricordo) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;

  input.onchange = async (e) => {
    for (const file of e.target.files) {
      const path = `ricordi/${currentUser.id}/${ricordo.id}-${Date.now()}-${file.name}`;
      await supabase.storage.from("instalbum").upload(path, file, { upsert: true });

      const url = supabase.storage.from("instalbum").getPublicUrl(path).data.publicUrl;

      await supabase.from("ricordi_photos").insert({
        ricordo_id: ricordo.id,
        image_path: url,
      });
    }

    const { data: photos } = await supabase
      .from("ricordi_photos")
      .select("*")
      .eq("ricordo_id", ricordo.id);

    openRicordoModal(ricordo, photos || []);
  };

  input.click();
}

async function deleteRicordoPhotos(ricordo) {
  await supabase.from("ricordi_photos").delete().eq("ricordo_id", ricordo.id);
  openRicordoModal(ricordo, []);
}

/* ============================================================
   BLOCCO 8 — Modal ricordo (corretto)
============================================================ */
function openRicordoModal(ricordo, photos) {
  currentRicordoInModal = ricordo;

  const modal = document.getElementById("ricordoModal");
  const captionEl = document.getElementById("ricordoModalCaption");
  const dateEl = document.getElementById("ricordoModalDate");
  const carousel = document.getElementById("ricordoModalCarousel");

  captionEl.textContent = ricordo.caption || "";
  dateEl.textContent = new Date(ricordo.created_at).toLocaleString();

  // --- SCORRIMENTO ORIZZONTALE ---
  carousel.innerHTML = "";
  carousel.style.display = "flex";
  carousel.style.flexDirection = "row";
  carousel.style.overflowX = "auto";
  carousel.style.overflowY = "hidden";
  carousel.style.gap = "10px";

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

  // --- RIMUOVI SEMPRE VECCHI TRE PUNTINI ---
  const oldBtn = document.getElementById("ricordoOptionsBtn");
  const oldMenu = document.getElementById("ricordoOptionsMenu");
  if (oldBtn) oldBtn.remove();
  if (oldMenu) oldMenu.remove();

  // --- CREA SEMPRE NUOVI TRE PUNTINI ---
  const optionsBtn = document.createElement("button");
  optionsBtn.id = "ricordoOptionsBtn";
  optionsBtn.textContent = "⋮";
  optionsBtn.style.marginLeft = "8px";

  const optionsMenu = document.createElement("div");
  optionsMenu.id = "ricordoOptionsMenu";
  optionsMenu.classList.add("hidden");
  optionsMenu.style.position = "absolute";
  optionsMenu.style.background = "white";
  optionsMenu.style.border = "1px solid #ddd";
  optionsMenu.style.borderRadius = "8px";
  optionsMenu.style.padding = "8px";
  optionsMenu.style.display = "flex";
  optionsMenu.style.flexDirection = "column";
  optionsMenu.style.gap = "4px";
  optionsMenu.style.zIndex = "50";

  // --- PULSANTI MENU ---
  const btnEdit = document.createElement("button");
  btnEdit.textContent = "Modifica copertina";
  btnEdit.onclick = () => {
    optionsMenu.classList.add("hidden");
    changeRicordoCover(currentRicordoInModal);
  };

  const btnAdd = document.createElement("button");
  btnAdd.textContent = "Aggiungi foto";
  btnAdd.onclick = () => {
    optionsMenu.classList.add("hidden");
    addRicordoPhotos(currentRicordoInModal);
  };

  const btnDeletePhotos = document.createElement("button");
  btnDeletePhotos.textContent = "Elimina tutte le foto";
  btnDeletePhotos.onclick = () => {
    optionsMenu.classList.add("hidden");
    deleteRicordoPhotos(currentRicordoInModal);
  };

  const btnDelete = document.createElement("button");
  btnDelete.textContent = "Elimina ricordo";
  btnDelete.style.color = "red";
  btnDelete.onclick = () => {
    optionsMenu.classList.add("hidden");
    deleteRicordo(currentRicordoInModal.id);
  };

  optionsMenu.append(btnEdit, btnAdd, btnDeletePhotos, btnDelete);

  captionEl.parentElement.style.position = "relative";
  captionEl.insertAdjacentElement("afterend", optionsBtn);
  captionEl.parentElement.appendChild(optionsMenu);

  optionsBtn.onclick = (e) => {
    e.stopPropagation();
    optionsMenu.classList.toggle("hidden");
    optionsMenu.style.top = optionsBtn.offsetTop + 20 + "px";
    optionsMenu.style.right = "0px";
  };

  document.addEventListener(
    "click",
    (e) => {
      if (!optionsMenu.contains(e.target) && e.target !== optionsBtn) {
        optionsMenu.classList.add("hidden");
      }
    },
    { once: true }
  );

  modal.classList.remove("hidden");
}
/* ============================================================
   BLOCCO 9 — Highlights (UI + Creazione + Modal + Menu)
============================================================ */
function setupHighlightsUI() {
  const newHighlightBtn = document.getElementById("newHighlightBtn");
  const newHighlightModal = document.getElementById("newHighlightModal");
  const closeNewHighlightModal = document.getElementById("closeNewHighlightModal");
  const createHighlightBtn = document.getElementById("createHighlightBtn");

  if (newHighlightBtn) {
    newHighlightBtn.onclick = () => newHighlightModal.classList.remove("hidden");
  }

  if (closeNewHighlightModal) {
    closeNewHighlightModal.onclick = () => newHighlightModal.classList.add("hidden");
  }

  if (newHighlightModal) {
    const backdrop = newHighlightModal.querySelector(".modal-backdrop");
    if (backdrop) {
      backdrop.onclick = () => newHighlightModal.classList.add("hidden");
    }
  }

  if (createHighlightBtn) {
    createHighlightBtn.onclick = createHighlight;
  }

  const highlightModal = document.getElementById("highlightModal");
  const closeHighlightModal = document.getElementById("closeHighlightModal");

  if (closeHighlightModal) {
    closeHighlightModal.onclick = () => highlightModal.classList.add("hidden");
  }

  if (highlightModal) {
    const backdrop = highlightModal.querySelector(".modal-backdrop");
    if (backdrop) {
      backdrop.onclick = () => highlightModal.classList.add("hidden");
    }
  }
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
    alert("Nome e copertina obbligatori");
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

/* ============================================================
   BLOCCO 10 — Funzioni modifica highlight
============================================================ */
async function deleteHighlight(highlightId) {
  await supabase.from("highlight_photos").delete().eq("highlight_id", highlightId);
  await supabase.from("highlights").delete().eq("id", highlightId);
  await loadHighlights();
  document.getElementById("highlightModal").classList.add("hidden");
}

async function changeHighlightCover(highlight) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const coverPath = `highlights/${currentUser.id}/cover-${Date.now()}.jpg`;
    const { error: coverError } = await supabase.storage
      .from("instalbum")
      .upload(coverPath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (coverError) {
      console.error("Errore cambio copertina highlight:", coverError);
      return;
    }

    const coverUrl = supabase.storage
      .from("instalbum")
      .getPublicUrl(coverPath).data.publicUrl;

    const { error: updateError } = await supabase
      .from("highlights")
      .update({ cover_image: coverUrl })
      .eq("id", highlight.id);

    if (updateError) {
      console.error("Errore update copertina highlight:", updateError);
      return;
    }

    await loadHighlights();

    const { data: photos } = await supabase
      .from("highlight_photos")
      .select("*")
      .eq("highlight_id", highlight.id);

    openHighlightModal(highlight, photos || []);
  };

  input.click();
}

async function addHighlightPhotos(highlight) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;

  input.onchange = async (e) => {
    const files = Array.from(e.target.files);

    for (const file of files) {
      const photoPath = `highlights_photos/${currentUser.id}/${highlight.id}-${Date.now()}-${file.name}`;
      const { error: photoError } = await supabase.storage
        .from("instalbum")
        .upload(photoPath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (photoError) {
        console.error("Errore upload nuova foto highlight:", photoError);
        continue;
      }

      const photoUrl = supabase.storage
        .from("instalbum")
        .getPublicUrl(photoPath).data.publicUrl;

      await supabase.from("highlight_photos").insert({
        highlight_id: highlight.id,
        image_path: photoUrl,
      });
    }

    const { data: photos } = await supabase
      .from("highlight_photos")
      .select("*")
      .eq("highlight_id", highlight.id);

    openHighlightModal(highlight, photos || []);
  };

  input.click();
}

async function deleteHighlightPhotos(highlight) {
  await supabase.from("highlight_photos").delete().eq("highlight_id", highlight.id);
  openHighlightModal(highlight, []);
}

/* ============================================================
   BLOCCO 11 — Modal highlight (corretto)
============================================================ */
async function openHighlightModal(highlight, preloadedPhotos) {
  currentHighlightInModal = highlight;

  const modal = document.getElementById("highlightModal");
  const titleEl = document.getElementById("highlightModalTitle");
  const carousel = document.getElementById("highlightModalCarousel");

  titleEl.textContent = highlight.title;

  let photos = preloadedPhotos;
  if (!photos) {
    const { data, error } = await supabase
      .from("highlight_photos")
      .select("*")
      .eq("highlight_id", highlight.id);

    if (error) {
      console.error("Errore caricamento foto highlight:", error);
      return;
    }
    photos = data || [];
  }

  // --- SCORRIMENTO ORIZZONTALE ---
  carousel.innerHTML = "";
  carousel.style.display = "flex";
  carousel.style.flexDirection = "row";
  carousel.style.overflowX = "auto";
  carousel.style.overflowY = "hidden";
  carousel.style.gap = "10px";

  if (!photos || photos.length === 0) {
    const img = document.createElement("img");
    img.classList.add("carousel-image");
    img.src = highlight.cover_image;
    carousel.appendChild(img);
  } else {
    photos.forEach((p) => {
      const img = document.createElement("img");
      img.classList.add("carousel-image");
      img.src = p.image_path;
      carousel.appendChild(img);
    });
  }

  // --- RIMUOVI SEMPRE VECCHI TRE PUNTINI ---
  const oldBtn = document.getElementById("highlightOptionsBtn");
  const oldMenu = document.getElementById("highlightOptionsMenu");
  if (oldBtn) oldBtn.remove();
  if (oldMenu) oldMenu.remove();

  // --- CREA SEMPRE NUOVI TRE PUNTINI ---
  const optionsBtn = document.createElement("button");
  optionsBtn.id = "highlightOptionsBtn";
  optionsBtn.textContent = "⋮";
  optionsBtn.style.marginLeft = "8px";

  const optionsMenu = document.createElement("div");
  optionsMenu.id = "highlightOptionsMenu";
  optionsMenu.classList.add("hidden");
  optionsMenu.style.position = "absolute";
  optionsMenu.style.background = "white";
  optionsMenu.style.border = "1px solid #ddd";
  optionsMenu.style.borderRadius = "8px";
  optionsMenu.style.padding = "8px";
  optionsMenu.style.display = "flex";
  optionsMenu.style.flexDirection = "column";
  optionsMenu.style.gap = "4px";
  optionsMenu.style.zIndex = "50";

  // --- PULSANTI MENU ---
  const btnEdit = document.createElement("button");
  btnEdit.textContent = "Modifica copertina";
  btnEdit.onclick = () => {
    optionsMenu.classList.add("hidden");
    changeHighlightCover(currentHighlightInModal);
  };

  const btnAdd = document.createElement("button");
  btnAdd.textContent = "Aggiungi foto";
  btnAdd.onclick = () => {
    optionsMenu.classList.add("hidden");
    addHighlightPhotos(currentHighlightInModal);
  };

  const btnDeletePhotos = document.createElement("button");
  btnDeletePhotos.textContent = "Elimina tutte le foto";
  btnDeletePhotos.onclick = () => {
    optionsMenu.classList.add("hidden");
    deleteHighlightPhotos(currentHighlightInModal);
  };

  const btnDelete = document.createElement("button");
  btnDelete.textContent = "Elimina highlight";
  btnDelete.style.color = "red";
  btnDelete.onclick = () => {
    optionsMenu.classList.add("hidden");
    deleteHighlight(currentHighlightInModal.id);
  };

  optionsMenu.append(btnEdit, btnAdd, btnDeletePhotos, btnDelete);

  titleEl.parentElement.style.position = "relative";
  titleEl.insertAdjacentElement("afterend", optionsBtn);
  titleEl.parentElement.appendChild(optionsMenu);

  optionsBtn.onclick = (e) => {
    e.stopPropagation();
    optionsMenu.classList.toggle("hidden");
    optionsMenu.style.top = optionsBtn.offsetTop + 20 + "px";
    optionsMenu.style.right = "0px";
  };

  document.addEventListener(
    "click",
    (e) => {
      if (!optionsMenu.contains(e.target) && e.target !== optionsBtn) {
        optionsMenu.classList.add("hidden");
      }
    },
    { once: true }
  );

  modal.classList.remove("hidden");
}
