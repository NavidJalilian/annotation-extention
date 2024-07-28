// popup.js

// Function to get the list of files from storage or initialize with default files
const container = document.getElementById("annotationsContainer");
const hiddenContainer = document.getElementById("hiddenQuotesContainer");

function getFiles(callback) {
  chrome.storage.local.get("files", (result) => {
    callback(
      result.files || [
        "quotes/Seven Habits of Highly Effective People, Stephen R. Covey.md",
        // Add default files here
      ]
    );
  });
}

// Save the list of files to storage
function saveFiles(files) {
  chrome.storage.local.set({ files }, () => {
    console.log("Files saved:", files);
  });
}

// Function to fetch markdown files and convert them to text
async function fetchMarkdownFiles(files) {
  const requests = files.map((file) =>
    fetch(file)
      .then((response) => response.text())
      .catch((err) => {
        console.error("Error fetching file:", file, err);
        return ""; // Return empty string if there's an error
      })
  );
  return Promise.all(requests);
}

// Function to split markdown text into individual quotes
function splitIntoQuotes(text) {
  return text.split("\n\n").filter((quote) => quote.trim() !== "");
}

// Function to get saved ratings from chrome.storage.local
function getRatings(callback) {
  chrome.storage.local.get("ratings", (result) => {
    callback(result.ratings || {});
  });
}

// Function to save ratings to chrome.storage.local
function saveRatings(ratings) {
  chrome.storage.local.set({ ratings }, () => {
    console.log("Ratings saved:", ratings);
  });
}

// Function to get viewed quotes from chrome.storage.local
function getViewedQuotes(callback) {
  chrome.storage.local.get("viewedQuotes", (result) => {
    callback(result.viewedQuotes || []);
  });
}

// Function to save viewed quotes to chrome.storage.local
function saveViewedQuotes(viewedQuotes) {
  chrome.storage.local.set({ viewedQuotes }, () => {
    console.log("Viewed quotes saved:", viewedQuotes);
  });
}

// Function to render hidden quotes in the side panel
function renderHiddenQuotes(viewedQuotes) {
  hiddenContainer.innerHTML = "";

  viewedQuotes.forEach((quote) => {
    const hiddenQuote = document.createElement("div");
    hiddenQuote.className = "hidden-quote";
    hiddenQuote.textContent = quote;

    hiddenContainer.appendChild(hiddenQuote);
  });
}

// Function to render annotations
async function renderAnnotations(fileFilter = null, random = true) {
  container.innerHTML = "";

  getFiles(async (files) => {
    const markdownTexts = await fetchMarkdownFiles(files);

    getRatings((ratings) => {
      getViewedQuotes((viewedQuotes) => {
        const quotesByFile = markdownTexts.map((text, index) => {
          const quotes = splitIntoQuotes(text).map((quote) => ({
            text: quote,
            file: files[index].split("/").pop(),
            rating: ratings[quote] || 1,
          }));
          return { fileName: files[index].split("/").pop(), quotes };
        });

        let quotes = quotesByFile.flatMap((file) => file.quotes);

        // Filter out viewed quotes
        quotes = quotes.filter((quote) => !viewedQuotes.includes(quote.text));

        // Adjust frequency based on rating
        quotes = quotes.flatMap((quote) => Array(quote.rating).fill(quote));

        const viewportHeight = window.innerHeight;
        const annotationHeight = 150; // Approximate height for each annotation card
        const numberOfAnnotations = Math.floor(
          viewportHeight / annotationHeight
        );

        if (fileFilter) {
          const file = quotesByFile.find((f) => f.fileName === fileFilter);
          file.quotes.forEach((quote) => {
            if (viewedQuotes.includes(quote.text)) return;

            const card = document.createElement("div");
            card.className = "p-4 bg-white rounded-lg shadow-md mb-2 card";

            const annotation = document.createElement("p");
            annotation.textContent = quote.text;
            annotation.className = "text-lg text-gray-700 card-text";

            const rating = document.createElement("div");
            rating.className = "mt-2";
            rating.innerHTML = "";

            for (let j = 1; j <= 5; j++) {
              const star = document.createElement("span");
              star.textContent = j <= quote.rating ? "★" : "☆";
              star.className = "cursor-pointer";
              star.onclick = (e) => {
                quote.rating = j;
                ratings[quote.text] = j;
                saveRatings(ratings);
                renderAnnotations(fileFilter, random);
              };
              rating.appendChild(star);
            }

            const eyeIcon = document.createElement("span");
            eyeIcon.innerHTML = "👁️";
            eyeIcon.className = "cursor-pointer ml-2";
            eyeIcon.onclick = () => {
              viewedQuotes.push(quote.text);
              saveViewedQuotes(viewedQuotes);
              renderAnnotations(fileFilter, random);
            };

            card.appendChild(annotation);
            card.appendChild(rating);
            card.appendChild(eyeIcon);
            container.appendChild(card);
          });
        } else if (random) {
          for (let i = 0; i < numberOfAnnotations; i++) {
            const card = document.createElement("div");
            card.className = "p-4 bg-white rounded-lg shadow-md card";

            const quote = quotes[Math.floor(Math.random() * quotes.length)];

            const annotation = document.createElement("p");
            annotation.textContent = quote.text;
            annotation.className = "text-lg text-gray-700 card-text";

            const fileLabel = document.createElement("p");
            fileLabel.textContent = `Source: ${quote.file}`;
            fileLabel.className = "text-sm text-gray-500 mt-2";

            const rating = document.createElement("div");
            rating.className = "mt-2";
            rating.innerHTML = "";

            for (let j = 1; j <= 5; j++) {
              const star = document.createElement("span");
              star.textContent = j <= quote.rating ? "★" : "☆";
              star.className = "cursor-pointer";
              star.onclick = () => {
                quote.rating = j;
                ratings[quote.text] = j;
                saveRatings(ratings);
                renderAnnotations(fileFilter, random);
              };
              rating.appendChild(star);
            }

            const eyeIcon = document.createElement("span");
            eyeIcon.innerHTML = "👁️";
            eyeIcon.className = "cursor-pointer ml-2";
            eyeIcon.onclick = () => {
              viewedQuotes.push(quote.text);
              saveViewedQuotes(viewedQuotes);
              renderAnnotations(fileFilter, random);
            };

            card.appendChild(annotation);
            card.appendChild(fileLabel);
            card.appendChild(rating);
            card.appendChild(eyeIcon);
            container.appendChild(card);
          }
        } else {
          quotesByFile.forEach((file) => {
            const folderCard = document.createElement("div");
            folderCard.className =
              "p-4 bg-gray-200 rounded-lg shadow-md mb-4 cursor-pointer";
            folderCard.textContent = file.fileName;
            folderCard.onclick = () => renderAnnotations(file.fileName, random);

            container.appendChild(folderCard);
          });
        }

        renderHiddenQuotes(viewedQuotes);
      });
    });
  });
}

// Handle file uploads
function handleFileUpload(files) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const content = event.target.result;
    const newFileName = `quotes/${files[0].name}`;

    getFiles((existingFiles) => {
      const updatedFiles = [...existingFiles, newFileName];
      saveFiles(updatedFiles);

      // Save the uploaded file content
      chrome.storage.local.set({ [newFileName]: content }, () => {
        console.log("File content saved:", newFileName);
        renderAnnotations(null, true);
      });
    });
  };

  reader.readAsText(files[0]);
}

// Event listener for file upload
document.getElementById("uploadButton").addEventListener("click", () => {
  const fileUploader = document.getElementById("fileUploader");
  if (fileUploader.files.length > 0) {
    handleFileUpload(fileUploader.files);
  }
});

// Display the random annotations
document.addEventListener("DOMContentLoaded", () => {
  const nextButton = document.getElementById("nextButton");
  const toggleButton = document.getElementById("toggleButton");

  nextButton.addEventListener("click", () => renderAnnotations(null, true));
  toggleButton.addEventListener("click", () => renderAnnotations(null, false));

  // Display initial random annotations
  renderAnnotations(null, true);
});

document.getElementById("clearStorageButton").addEventListener("click", () => {
  chrome.storage.local.clear(() => {
    console.log("Storage cleared");
    renderAnnotations(); // Re-render annotations to reflect the cleared state
    hiddenContainer.innerHTML = ""; // Clear hidden quotes container
  });
});