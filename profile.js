// profile.js
import { supabase } from "./supabaseClient.js";

let currentUser = null;
let currentRicordoInModal = null;
let currentHighlightInModal = null;

// PRIMO BLOCCO: upload diretto avatar
document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const profilePic = document.getElementById("profilePic");
  const changePicBtn = document.getElementById("changePicBtn");
  const profilePicInput = document.getElementById("profilePicInput");

  changePicBtn.addEventListener("click", () => {
    profilePicInput.click();
  });

  profilePicInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filePath = `profile/${user.id}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("instalbum")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error(uploadError);
      alert("Errore nel caricamento della foto");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("instalbum")
      .getPublicUrl(filePath);

    profilePic.src = urlData.publicUrl;
  });
});

// INIZIALIZZAZIONE
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

// FUNZIONI DI MODIFICA RICORDO
async function deleteRicordo(ricordoId) {
  await supabase.from("ricordi_photos").delete().eq("ricordo_id", ricordoId);
  await supabase.from("ricordi").delete().eq("id", ricordoId);
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

    const coverPath = `ricordi/${currentUser.id}/cover-${Date.now()}.jpg`;
    const { error: coverError } = await supabase.storage
      .from("instalbum")
      .upload(coverPath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (coverError) {
      console.error("Errore cambio copertina:", coverError);
      return;
    }

    const coverUrl = supabase.storage
      .from("instalbum")
      .getPublicUrl(coverPath).data.publicUrl;

    const { error: updateError } = await supabase
      .from("ricordi")
      .update({ cover_image: coverUrl })
      .eq("id", ricordo.id);

    if (updateError) {
      console.error("Errore update copertina:", updateError);
      return;
    }

    await loadRicordi();

    const { data: photos } = await supabase
      .from("ricordi_photos")
      .select("*")
      .eq("ricordo_id", ricordo.id);

    openRicordoModal(ricordo, photos || []);
  };

  input.click();
}

async function addRicordoPhotos(ricordo) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;

  input.onchange = async (e) => {
    const files = Array.from(e.target.files);

    for (const file of files) {
      const photoPath = `ricordi/${currentUser.id}/${ricordo.id}-${Date.now()}-${file.name}`;
      const { error: photoError } = await supabase.storage
        .from("instalbum")
        .upload(photoPath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (photoError) {
        console.error("Errore upload nuova foto:", photoError);
        continue;
      }

      const photoUrl = supabase.storage
        .from("instalbum")
        .getPublicUrl(photoPath).data.publicUrl;

      await supabase.from("ricordi_photos").insert({
        ricordo_id: ricordo.id,
        image_path: photoUrl,
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

// MODAL RICORDO + TRE PUNTINI + SCORRIMENTO ORIZZONTALE
function openRicordoModal(ricordo, photos) {
  currentRicordoInModal = ricordo;

  const modal = document.getElementById("ricordoModal");
  const captionEl = document.getElementById("ricordoModalCaption");
  const dateEl = document.getElementById("ricordoModalDate");
  const carousel = document.getElementById("ricordoModalCarousel");

  captionEl.textContent = ricordo.caption || "";
  dateEl.textContent = new Date(ricordo.created_at).toLocaleString();

  carousel.innerHTML = "";
  carousel.style.display = "flex";
  carousel.style.overflowX = "auto";
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

  let optionsBtn = document.getElementById("ricordoOptionsBtn");
  let optionsMenu = document.getElementById("ricordoOptionsMenu");

  if (!optionsBtn) {
    optionsBtn = document.createElement("button");
    optionsBtn.id = "ricordoOptionsBtn";
    optionsBtn.textContent = "⋮";
    optionsBtn.style.marginLeft = "8px";

    optionsMenu = document.createElement("div");
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

    const btnEdit = document.createElement("button");
    btnEdit.textContent = "Modifica copertina";
    btnEdit.addEventListener("click", () => {
      optionsMenu.classList.add("hidden");
      changeRicordoCover(currentRicordoInModal);
    });

    const btnAdd = document.createElement("button");
    btnAdd.textContent = "Aggiungi foto";
    btnAdd.addEventListener("click", () => {
      optionsMenu.classList.add("hidden");
      addRicordoPhotos(currentRicordoInModal);
    });

    const btnDeletePhotos = document.createElement("button");
    btnDeletePhotos.textContent = "Elimina tutte le foto";
    btnDeletePhotos.addEventListener("click", () => {
      optionsMenu.classList.add("hidden");
      deleteRicordoPhotos(currentRicordoInModal);
    });

    const btnDelete = document.createElement("button");
    btnDelete.textContent = "Elimina ricordo";
    btnDelete.style.color = "red";
    btnDelete.addEventListener("click", () => {
      optionsMenu.classList.add("hidden");
      deleteRicordo(currentRicordoInModal.id);
    });

    optionsMenu.appendChild(btnEdit);
    optionsMenu.appendChild(btnAdd);
    optionsMenu.appendChild(btnDeletePhotos);
    optionsMenu.appendChild(btnDelete);

    captionEl.parentElement.style.position = "relative";
    captionEl.insertAdjacentElement("afterend", optionsBtn);
    captionEl.parentElement.appendChild(optionsMenu);

    optionsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      optionsMenu.classList.toggle("hidden");
      optionsMenu.style.top = optionsBtn.offsetTop + 20 + "px";
      optionsMenu.style.right = "0px";
    });

    document.addEventListener("click", (e) => {
      if (
        !optionsMenu.classList.contains("hidden") &&
        !optionsMenu.contains(e.target) &&
        e.target !== optionsBtn
      ) {
        optionsMenu.classList.add("hidden");
      }
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

// FUNZIONI DI MODIFICA HIGHLIGHT
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

// MODAL HIGHLIGHT + TRE PUNTINI + SCORRIMENTO ORIZZONTALE
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

  carousel.innerHTML = "";
  carousel.style.display = "flex";
  carousel.style.overflowX = "auto";
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

  let optionsBtn = document.getElementById("highlightOptionsBtn");
  let optionsMenu = document.getElementById("highlightOptionsMenu");

  if (!optionsBtn) {
    optionsBtn = document.createElement("button");
    optionsBtn.id = "highlightOptionsBtn";
    optionsBtn.textContent = "⋮";
    optionsBtn.style.marginLeft = "8px";

    optionsMenu = document.createElement("div");
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

    const btnEdit = document.createElement("button");
    btnEdit.textContent = "Modifica copertina";
    btnEdit.addEventListener("click", () => {
      optionsMenu.classList.add("hidden");
      changeHighlightCover(currentHighlightInModal);
    });

    const btnAdd = document.createElement("button");
    btnAdd.textContent = "Aggiungi foto";
    btnAdd.addEventListener("click", () => {
      optionsMenu.classList.add("hidden");
      addHighlightPhotos(currentHighlightInModal);
    });

    const btnDeletePhotos = document.createElement("button");
    btnDeletePhotos.textContent = "Elimina tutte le foto";
    btnDeletePhotos.addEventListener("click", () => {
      optionsMenu.classList.add("hidden");
      deleteHighlightPhotos(currentHighlightInModal);
    });

    const btnDelete = document.createElement("button");
    btnDelete.textContent = "Elimina highlight";
    btnDelete.style.color = "red";
    btnDelete.addEventListener("click", () => {
      optionsMenu.classList.add("hidden");
      deleteHighlight(currentHighlightInModal.id);
    });

    optionsMenu.appendChild(btnEdit);
    optionsMenu.appendChild(btnAdd);
    optionsMenu.appendChild(btnDeletePhotos);
    optionsMenu.appendChild(btnDelete);

    titleEl.parentElement.style.position = "relative";
    titleEl.insertAdjacentElement("afterend", optionsBtn);
    titleEl.parentElement.appendChild(optionsMenu);

    optionsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      optionsMenu.classList.toggle("hidden");
      optionsMenu.style.top = optionsBtn.offsetTop + 20 + "px";
      optionsMenu.style.right = "0px";
    });

    document.addEventListener("click", (e) => {
      if (
        !optionsMenu.classList.contains("hidden") &&
        !optionsMenu.contains(e.target) &&
        e.target !== optionsBtn
      ) {
        optionsMenu.classList.add("hidden");
      }
    });
  }

  modal.classList.remove("hidden");
}
