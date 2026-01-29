const storageKey = "appClipboardData";

const defaultData = {
  notes: [
    {
      id: "seed-1",
      title: "Cloud SQL Prod Credentials",
      content: "Host: prod-db.internal\nUser: app_readonly\nPassword: replace-with-secret\nDocs: https://cloud.google.com/sql",
      categories: ["database", "prod"],
      favorite: true,
      archived: false,
      updatedAt: Date.now()
    },
    {
      id: "seed-2",
      title: "Release checklist",
      content: "1) npm run test\n2) npm run build\n3) Tag release\nDocs: https://example.com/release",
      categories: ["ops", "release"],
      favorite: false,
      archived: false,
      updatedAt: Date.now()
    },
    {
      id: "seed-3",
      title: "Local dev URLs",
      content: "Frontend: http://localhost:5173\nAPI: http://localhost:3000\nStorybook: http://localhost:6006",
      categories: ["local", "urls"],
      favorite: true,
      archived: false,
      updatedAt: Date.now()
    },
    {
      id: "seed-4",
      title: "SSH / VPN",
      content: "Bastion: ssh dev@bastion.internal\nVPN: https://vpn.example.com\nKey vault: https://vault.example.com",
      categories: ["infra", "access"],
      favorite: false,
      archived: false,
      updatedAt: Date.now()
    },
    {
      id: "seed-5",
      title: "Stripe test cards",
      content: "Visa: 4242 4242 4242 4242\n3DS: 4000 0027 6000 3184\nDecline: 4000 0000 0000 9995\nDocs: https://stripe.com/docs/testing",
      categories: ["payments", "testing"],
      favorite: false,
      archived: false,
      updatedAt: Date.now()
    },
    {
      id: "seed-6",
      title: "API headers",
      content: "Authorization: Bearer <token>\nContent-Type: application/json\nX-Request-Id: <uuid>",
      categories: ["api", "headers"],
      favorite: false,
      archived: false,
      updatedAt: Date.now()
    },
    {
      id: "seed-7",
      title: "Git shortcuts",
      content: "git checkout -b feature/\n git status\n git push -u origin HEAD",
      categories: ["git", "workflow"],
      favorite: false,
      archived: false,
      updatedAt: Date.now()
    },
    {
      id: "seed-8",
      title: "PagerDuty escalation",
      content: "Primary: @oncall\nSecondary: #incident-room\nDocs: https://example.com/oncall",
      categories: ["ops", "incident"],
      favorite: false,
      archived: false,
      updatedAt: Date.now()
    }
  ],
  categories: [],
  presets: [
    { id: "preset-1", name: "Prod access", tags: ["prod", "infra", "access"], format: "full" },
    { id: "preset-2", name: "API debug", tags: ["api", "headers"], format: "content" },
    { id: "preset-3", name: "Local URLs", tags: ["local", "urls"], format: "links" },
    { id: "preset-4", name: "Incident ops", tags: ["ops", "incident"], format: "full" }
  ]
};

const state = {
  data: { ...defaultData },
  activeTag: "all",
  searchText: "",
  editingId: null,
  showArchived: false,
  showFavorites: false
};

const elements = {
  noteList: document.getElementById("note-list"),
  tagFilter: document.getElementById("tag-filter"),
  search: document.getElementById("search"),
  newNote: document.getElementById("new-note"),
  editor: document.getElementById("editor"),
  editorTitle: document.getElementById("editor-title"),
  noteTitle: document.getElementById("note-title"),
  noteContent: document.getElementById("note-content"),
  noteTags: document.getElementById("note-tags"),
  cancelEdit: document.getElementById("cancel-edit"),
  saveNote: document.getElementById("save-note"),
  noteCount: document.getElementById("note-count"),
  copyFormat: document.getElementById("copy-format"),
  copyFiltered: document.getElementById("copy-filtered"),
  toggleArchived: document.getElementById("toggle-archived"),
  toggleFavorites: document.getElementById("toggle-favorites"),
  copyLinks: document.getElementById("copy-links"),
  openSwagger: document.getElementById("open-swagger"),
  editSwagger: document.getElementById("edit-swagger"),
  exportData: document.getElementById("export-data"),
  importData: document.getElementById("import-data"),
  importFile: document.getElementById("import-file"),
  restoreDefaults: document.getElementById("restore-defaults"),
  savePreset: document.getElementById("save-preset"),
  presetList: document.getElementById("preset-list"),
  presetModal: document.getElementById("preset-modal"),
  presetName: document.getElementById("preset-name"),
  presetTags: document.getElementById("preset-tags"),
  presetFormat: document.getElementById("preset-format"),
  closePresetModal: document.getElementById("close-preset-modal"),
  cancelPreset: document.getElementById("cancel-preset"),
  savePresetModal: document.getElementById("save-preset-modal")
};

const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

const createId = () => crypto.randomUUID();

const getTagList = (text) =>
  text
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

const safeAddEventListener = (element, eventName, handler) => {
  if (!element) {
    return;
  }
  element.addEventListener(eventName, handler);
};

const extractLinks = (text) => text.match(/https?:\/\/[^\s]+/g) || [];

const presetState = {
  editingId: null
};

const promptSwaggerUrl = () => {
  const existing = state.data.swaggerUrl || "";
  const url = window.prompt("Swagger URL", existing || "https://api.example.com/swagger");
  if (!url) {
    return null;
  }
  state.data.swaggerUrl = url;
  persistData();
  return url;
};

const mergeUniqueById = (existing, incoming) => {
  const map = new Map();
  [...existing, ...incoming].forEach((item) => {
    if (item && item.id) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
};

const openPresetModal = (preset) => {
  elements.presetModal.classList.add("active");
  elements.presetModal.setAttribute("aria-hidden", "false");
  if (preset) {
    presetState.editingId = preset.id;
    elements.presetName.value = preset.name;
    elements.presetTags.value = (preset.tags || []).join(", ");
    elements.presetFormat.value = preset.format || "content";
  } else {
    presetState.editingId = null;
    elements.presetName.value = "";
    elements.presetTags.value = state.activeTag !== "all" ? state.activeTag : "";
    elements.presetFormat.value = elements.copyFormat.value;
  }
};

const closePresetModal = () => {
  elements.presetModal.classList.remove("active");
  elements.presetModal.setAttribute("aria-hidden", "true");
};

const formatNote = (note, format) => {
  if (format === "json") {
    return JSON.stringify(note, null, 2);
  }
  if (format === "links") {
    return extractLinks(note.content).join("\n");
  }
  if (format === "full") {
    return `${note.title}\n${note.content}`.trim();
  }
  return note.content;
};

const combineNotes = (notes, format) => {
  if (format === "json") {
    return JSON.stringify(notes, null, 2);
  }
  if (format === "links") {
    const links = notes.flatMap((note) => extractLinks(note.content));
    return Array.from(new Set(links)).join("\n");
  }
  return notes.map((note) => formatNote(note, format)).filter(Boolean).join("\n\n---\n\n");
};

const linkify = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noreferrer">${url}</a>`);
};

const loadData = async () => {
  const stored = await chrome.storage.local.get(storageKey);
  const storedData = stored && stored[storageKey] ? stored[storageKey] : {};
  state.data = { ...defaultData, ...storedData };
  if (!Array.isArray(state.data.notes) || state.data.notes.length === 0) {
    state.data.notes = [...defaultData.notes];
  }
  if (!Array.isArray(state.data.presets) || state.data.presets.length === 0) {
    state.data.presets = [...defaultData.presets];
  }
  state.showArchived = state.data.viewState?.showArchived ?? false;
  state.showFavorites = state.data.viewState?.showFavorites ?? false;
  state.data.notes = state.data.notes.map((note) => ({
    favorite: false,
    archived: false,
    ...note
  }));
  const hasVisibleNotes = state.data.notes.some((note) => !note.archived);
  if (!hasVisibleNotes) {
    state.data.notes = state.data.notes.map((note) => ({
      ...note,
      archived: false
    }));
    state.showArchived = false;
  }
  state.data.viewState = {
    showArchived: state.showArchived,
    showFavorites: state.showFavorites
  };
  await persistData();
  render();
};

const persistData = async () => {
  await chrome.storage.local.set({ [storageKey]: state.data });
};

const openEditor = (note) => {
  elements.editor.classList.add("active");
  elements.editor.setAttribute("aria-hidden", "false");
  if (note) {
    state.editingId = note.id;
    elements.editorTitle.textContent = "Edit note";
    elements.noteTitle.value = note.title;
    elements.noteContent.value = note.content;
    elements.noteTags.value = note.categories.join(", ");
  } else {
    state.editingId = null;
    elements.editorTitle.textContent = "New note";
    elements.noteTitle.value = "";
    elements.noteContent.value = "";
    elements.noteTags.value = "";
  }
};

const closeEditor = () => {
  elements.editor.classList.remove("active");
  elements.editor.setAttribute("aria-hidden", "true");
};

const saveNote = async () => {
  const title = elements.noteTitle.value.trim() || "Untitled";
  const content = elements.noteContent.value.trim();
  const categories = getTagList(elements.noteTags.value);

  if (!content) {
    return;
  }

  if (state.editingId) {
    const note = state.data.notes.find((item) => item.id === state.editingId);
    if (note) {
      note.title = title;
      note.content = content;
      note.categories = categories;
      note.updatedAt = Date.now();
    }
  } else {
    state.data.notes.unshift({
      id: createId(),
      title,
      content,
      categories,
      favorite: false,
      archived: false,
      updatedAt: Date.now()
    });
  }

  syncCategories();
  await persistData();
  closeEditor();
  render();
};

const syncCategories = () => {
  const map = new Map();
  state.data.notes.forEach((note) => {
    note.categories.forEach((tag) => {
      const id = slugify(tag);
      if (!map.has(id)) {
        map.set(id, { id, name: tag });
      }
    });
  });
  state.data.categories = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const filterNotes = () => {
  const search = state.searchText.toLowerCase();
  return state.data.notes.filter((note) => {
    const matchesTag =
      state.activeTag === "all" || note.categories.some((tag) => slugify(tag) === state.activeTag);
    const matchesSearch =
      note.title.toLowerCase().includes(search) ||
      note.content.toLowerCase().includes(search) ||
      note.categories.some((tag) => tag.toLowerCase().includes(search));
    const matchesArchived = state.showArchived ? true : !note.archived;
    const matchesFavorites = state.showFavorites ? note.favorite : true;
    return matchesTag && matchesSearch && matchesArchived && matchesFavorites;
  });
};

const renderTags = () => {
  elements.tagFilter.innerHTML = "";
  const allTag = document.createElement("button");
  allTag.className = `tag-pill ${state.activeTag === "all" ? "active" : ""}`;
  allTag.textContent = "All";
  allTag.addEventListener("click", () => {
    state.activeTag = "all";
    render();
  });
  elements.tagFilter.appendChild(allTag);

  const favoritesPill = document.createElement("button");
  favoritesPill.className = `tag-pill ${state.showFavorites ? "active" : ""}`;
  favoritesPill.textContent = "Favorites";
  favoritesPill.addEventListener("click", () => {
    state.showFavorites = !state.showFavorites;
    state.data.viewState = {
      showArchived: state.showArchived,
      showFavorites: state.showFavorites
    };
    persistData();
    render();
  });
  elements.tagFilter.appendChild(favoritesPill);

  state.data.categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = `tag-pill ${state.activeTag === category.id ? "active" : ""}`;
    button.textContent = category.name;
    button.addEventListener("click", () => {
      state.activeTag = category.id;
      render();
    });
    elements.tagFilter.appendChild(button);
  });
};

const copyToClipboard = async (text) => {
  await navigator.clipboard.writeText(text);
};

const handleCopy = async (note, format = "content") => {
  await copyToClipboard(formatNote(note, format));
  const original = elements.noteCount.textContent;
  elements.noteCount.textContent = `Copied "${note.title}"`;
  setTimeout(() => {
    elements.noteCount.textContent = original;
  }, 1200);
};

const handleCopyNotes = async (notes, label, format) => {
  const payload = combineNotes(notes, format);
  if (!payload) {
    return;
  }
  await copyToClipboard(payload);
  const original = elements.noteCount.textContent;
  elements.noteCount.textContent = `Copied ${label}`;
  setTimeout(() => {
    elements.noteCount.textContent = original;
  }, 1200);
};

const handlePresetCopy = async (preset) => {
  const tags = preset.tags || [];
  const notes = state.data.notes.filter((note) => {
    if (!state.showArchived && note.archived) {
      return false;
    }
    if (!tags.length) {
      return true;
    }
    return note.categories.some((tag) => tags.includes(slugify(tag)) || tags.includes(tag));
  });
  await handleCopyNotes(notes, preset.name, preset.format || "content");
};

const renderPresets = () => {
  elements.presetList.innerHTML = "";
  state.data.presets.forEach((preset) => {
    const pill = document.createElement("div");
    pill.className = "preset-pill";
    pill.setAttribute("role", "button");
    pill.setAttribute("tabindex", "0");
    const label = document.createElement("strong");
    label.textContent = preset.name;
    pill.appendChild(label);

    const actions = document.createElement("span");
    actions.className = "preset-actions";

    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.addEventListener("click", (event) => {
      event.stopPropagation();
      openPresetModal(preset);
    });

    const remove = document.createElement("button");
    remove.textContent = "Delete";
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      state.data.presets = state.data.presets.filter((item) => item.id !== preset.id);
      persistData().then(render);
    });

    actions.appendChild(edit);
    actions.appendChild(remove);
    pill.appendChild(actions);

    pill.addEventListener("click", () => handlePresetCopy(preset));
    pill.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        handlePresetCopy(preset);
      }
    });
    elements.presetList.appendChild(pill);
  });
};

const renderNotes = () => {
  const notes = filterNotes();
  elements.noteList.innerHTML = "";

  if (
    !notes.length &&
    state.data.notes.length &&
    !state.searchText &&
    state.activeTag === "all" &&
    !state.showFavorites &&
    !state.showArchived
  ) {
    state.showArchived = true;
    state.data.viewState = {
      showArchived: state.showArchived,
      showFavorites: state.showFavorites
    };
    persistData().then(render);
    return;
  }

  if (!notes.length) {
    const empty = document.createElement("div");
    empty.className = "note-card";
    empty.textContent = "No notes yet. Click New to add your first entry.";
    elements.noteList.appendChild(empty);
    return;
  }

  notes.forEach((note) => {
    const card = document.createElement("div");
    card.className = "note-card";
    card.addEventListener("click", () => handleCopy(note, elements.copyFormat.value));

    const header = document.createElement("div");
    header.className = "note-title";
    header.textContent = note.title;

    const content = document.createElement("div");
    content.className = "note-content";
    content.textContent = note.content;

    const links = document.createElement("div");
    links.className = "note-links";
    links.innerHTML = linkify(note.content);
    links.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    const tagWrap = document.createElement("div");
    tagWrap.className = "note-tags";
    note.categories.forEach((tag) => {
      const tagEl = document.createElement("span");
      tagEl.className = "note-tag";
      tagEl.textContent = tag;
      tagWrap.appendChild(tagEl);
    });

    const actions = document.createElement("div");
    actions.className = "note-actions";

    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.addEventListener("click", (event) => {
      event.stopPropagation();
      openEditor(note);
    });

    const copyFull = document.createElement("button");
    copyFull.textContent = "Copy full";
    copyFull.addEventListener("click", (event) => {
      event.stopPropagation();
      handleCopy(note, "full");
    });

    const copyJson = document.createElement("button");
    copyJson.textContent = "Copy JSON";
    copyJson.addEventListener("click", (event) => {
      event.stopPropagation();
      handleCopy(note, "json");
    });

    const copyLinks = document.createElement("button");
    copyLinks.textContent = "Copy links";
    copyLinks.addEventListener("click", (event) => {
      event.stopPropagation();
      handleCopy(note, "links");
    });

    const favorite = document.createElement("button");
    favorite.textContent = note.favorite ? "Unfavorite" : "Favorite";
    if (note.favorite) {
      favorite.classList.add("active");
    }
    favorite.addEventListener("click", async (event) => {
      event.stopPropagation();
      note.favorite = !note.favorite;
      await persistData();
      render();
    });

    const archive = document.createElement("button");
    archive.textContent = note.archived ? "Restore" : "Archive";
    archive.addEventListener("click", async (event) => {
      event.stopPropagation();
      note.archived = !note.archived;
      await persistData();
      render();
    });

    const duplicate = document.createElement("button");
    duplicate.textContent = "Duplicate";
    duplicate.addEventListener("click", async (event) => {
      event.stopPropagation();
      state.data.notes.unshift({
        ...note,
        id: createId(),
        title: `${note.title} (copy)`,
        updatedAt: Date.now()
      });
      await persistData();
      render();
    });

    const remove = document.createElement("button");
    remove.textContent = "Delete";
    remove.addEventListener("click", async (event) => {
      event.stopPropagation();
      state.data.notes = state.data.notes.filter((item) => item.id !== note.id);
      syncCategories();
      await persistData();
      render();
    });

    actions.appendChild(edit);
    actions.appendChild(copyFull);
    actions.appendChild(copyJson);
    actions.appendChild(copyLinks);
    actions.appendChild(favorite);
    actions.appendChild(archive);
    actions.appendChild(duplicate);
    actions.appendChild(remove);

    card.appendChild(header);
    card.appendChild(content);
    if (note.content.match(/https?:\/\//)) {
      card.appendChild(links);
    }
    if (note.categories.length) {
      card.appendChild(tagWrap);
    }
    card.appendChild(actions);

    elements.noteList.appendChild(card);
  });
};

const render = () => {
  syncCategories();
  renderTags();
  renderPresets();
  renderNotes();
  const total = state.data.notes.filter((note) => (state.showArchived ? true : !note.archived)).length;
  if (elements.noteCount) {
    elements.noteCount.textContent = `${total} notes`;
  }
  if (elements.toggleArchived) {
    elements.toggleArchived.textContent = state.showArchived ? "Hide archived" : "Show archived";
  }
  if (elements.toggleFavorites) {
    elements.toggleFavorites.textContent = state.showFavorites ? "All notes" : "Favorites";
  }
};

const bindEvents = () => {
  safeAddEventListener(elements.newNote, "click", () => openEditor());
  safeAddEventListener(elements.cancelEdit, "click", closeEditor);
  safeAddEventListener(elements.saveNote, "click", saveNote);
  safeAddEventListener(elements.copyFiltered, "click", async () => {
    const notes = filterNotes();
    await handleCopyNotes(notes, "filtered notes", elements.copyFormat.value);
  });
  safeAddEventListener(elements.copyLinks, "click", async () => {
    const notes = filterNotes();
    await handleCopyNotes(notes, "links", "links");
  });
  safeAddEventListener(elements.openSwagger, "click", () => {
    if (!state.data.swaggerUrl) {
      return;
    }
    window.open(state.data.swaggerUrl, "_blank");
  });
  safeAddEventListener(elements.editSwagger, "click", () => {
    const url = promptSwaggerUrl();
    if (url) {
      window.open(url, "_blank");
    }
  });
  safeAddEventListener(elements.toggleArchived, "click", async () => {
    state.showArchived = !state.showArchived;
    state.data.viewState = {
      showArchived: state.showArchived,
      showFavorites: state.showFavorites
    };
    await persistData();
    render();
  });
  safeAddEventListener(elements.toggleFavorites, "click", async () => {
    state.showFavorites = !state.showFavorites;
    state.data.viewState = {
      showArchived: state.showArchived,
      showFavorites: state.showFavorites
    };
    await persistData();
    render();
  });
  safeAddEventListener(elements.exportData, "click", () => {
    const payload = JSON.stringify(state.data, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "app-clipboard-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
  });
  safeAddEventListener(elements.importData, "click", () => {
    elements.importFile.click();
  });
  safeAddEventListener(elements.importFile, "change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const content = await file.text();
    try {
      const imported = JSON.parse(content);
      if (!imported?.notes) {
        return;
      }
      state.data = {
        ...defaultData,
        ...imported,
        notes: mergeUniqueById(defaultData.notes, imported.notes || []),
        presets: mergeUniqueById(defaultData.presets, imported.presets || [])
      };
      state.data.notes = state.data.notes.map((note) => ({
        favorite: false,
        archived: false,
        ...note
      }));
      await persistData();
      render();
    } catch (error) {
      console.error("Import failed", error);
    }
    event.target.value = "";
  });
  safeAddEventListener(elements.restoreDefaults, "click", async () => {
    state.data = {
      ...defaultData,
      swaggerUrl: state.data.swaggerUrl || ""
    };
    state.data.notes = state.data.notes.map((note) => ({
      favorite: false,
      archived: false,
      ...note
    }));
    state.showArchived = false;
    state.showFavorites = false;
    state.data.viewState = {
      showArchived: state.showArchived,
      showFavorites: state.showFavorites
    };
    await persistData();
    render();
  });
  safeAddEventListener(elements.savePreset, "click", async () => {
    openPresetModal();
  });
  safeAddEventListener(elements.closePresetModal, "click", closePresetModal);
  safeAddEventListener(elements.cancelPreset, "click", closePresetModal);
  safeAddEventListener(elements.presetModal, "click", (event) => {
    if (event.target === elements.presetModal) {
      closePresetModal();
    }
  });
  safeAddEventListener(elements.savePresetModal, "click", async () => {
    const name = elements.presetName.value.trim();
    if (!name) {
      return;
    }
    const tags = getTagList(elements.presetTags.value).map((tag) => tag.toLowerCase());
    const format = elements.presetFormat.value;
    if (presetState.editingId) {
      const preset = state.data.presets.find((item) => item.id === presetState.editingId);
      if (preset) {
        preset.name = name;
        preset.tags = tags;
        preset.format = format;
      }
    } else {
      state.data.presets.unshift({
        id: createId(),
        name,
        tags,
        format
      });
    }
    await persistData();
    closePresetModal();
    render();
  });
  safeAddEventListener(elements.search, "input", (event) => {
    state.searchText = event.target.value;
    renderNotes();
  });
  document.addEventListener("keydown", (event) => {
    const isMeta = event.metaKey || event.ctrlKey;
    if (isMeta && event.key.toLowerCase() === "n") {
      event.preventDefault();
      openEditor();
      return;
    }
    if (isMeta && event.key.toLowerCase() === "s") {
      if (elements.editor.classList.contains("active")) {
        event.preventDefault();
        saveNote();
      }
      return;
    }
    if (isMeta && event.key.toLowerCase() === "f") {
      event.preventDefault();
      elements.search.focus();
      return;
    }
    if (isMeta && event.key.toLowerCase() === "k") {
      event.preventDefault();
      elements.search.focus();
      elements.search.select();
      return;
    }
    if (event.key === "Escape" && elements.editor.classList.contains("active")) {
      event.preventDefault();
      closeEditor();
    }
  });
};

bindEvents();
loadData();
