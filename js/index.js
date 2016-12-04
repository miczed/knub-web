/**
 * Created by michaelziorjen on 21.11.16.
 */


/*
TODO: add hierarchical category functionality
TODO: do some more styling
TODO: modify delete function so it takes a firebase key as an argument (functional programming xD)
TODO: add delete button to links in sidebar
TODO: show only cards from selected category
 */

const toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
    ['blockquote', 'code-block'],

    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript

    [{ 'header': [1, 2, false] }],

    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
    [{ 'align': [] }],

    ['formula','image','video']

];

const front = new Quill('#front-editor', {
    modules: { formula: true, toolbar: toolbarOptions },
    theme: 'snow'
});

const back = new Quill('#back-editor', {
    modules: { formula: true, toolbar: toolbarOptions },
    theme: 'snow'
});



// Global cards store
let cardsStore = []; // Stores all cards locally in the browser (later via localstorage)
let categoriesStore = []; // Stores all categories locally in the browser (later via localstorage)
let cardRef; // The currently selected card
let cardsRef = firebase.database().ref('cards'); // The reference to ALL the cards
let categoryRef; // The currently selected category
let categoriesRef = firebase.database().ref('categories'); // Reference to ALL the categories

/**
 * Called initially and whenever firebase detects a change on a cards object
 */
cardsRef.on('value', function(snapshot) {
    let data = snapshot.val();
    cardsStore = snapshot.val(); // Store returned data in global cards store
    let dataWithKeys = Object.keys(data).map((key) => {
        let obj = data[key];
        obj._key = key;
        return obj;
    });
    updateCardsList(dataWithKeys);
});
/**
 * Called initially and whenever firebase detects a change on a category object
 */
categoriesRef.on("value", function(snapshot) {
    let data = snapshot.val();
    categoriesStore = data;
    let dataWithKeys = [];
    if(data != null) {
        dataWithKeys = Object.keys(data).map((key) => {
            let obj = data[key];
            obj._key = key;
            return obj;
        });
    }
    updateCategoriesList(dataWithKeys, document.getElementById("categories-list"));
    const dummy = { _key: "", title: "-- keine Kategorie --"};
    dataWithKeys.unshift(dummy);
    updateCategoriesSelect(dataWithKeys, document.getElementById("card-category"));
    updateCategoriesSelect(dataWithKeys, document.getElementById("category-parent"));
});

/**
 * Updates all dom elements which contain a list of cards
 * @param cardsList Array with cards
 */
function updateCardsList(cardsList) {
    const cardsListElem = document.getElementById("cards-list");
    while (cardsListElem.hasChildNodes()) {
        cardsListElem.removeChild(cardsListElem.firstChild);
    }

    for(let i = 0; i < cardsList.length; i++) {
        let node = document.createElement("LI");
        let title = document.createTextNode(cardsList[i].title);
        let edit_button = document.createElement("BUTTON");
        let edit_button_icon = document.createElement("SPAN");
        edit_button_icon.setAttribute("class","icon-pencil");
        edit_button.appendChild(edit_button_icon);

        edit_button.setAttribute("data-key", cardsList[i]._key);
        edit_button.setAttribute("class","transparent");
        node.appendChild(title);
        node.appendChild(edit_button);

        edit_button.addEventListener("click",function() {
           loadCard(this.getAttribute("data-key"));
           return true;
        });
        cardsListElem.appendChild(node);
    }
}

/**
 * Updates a single UL DOM element with the list of categories
 * @param categoriesList
 * @param elem UL element
 */
function updateCategoriesList(categoriesList, elem) {
    if(elem) {
        while (elem.hasChildNodes()) {
            elem.removeChild(elem.firstChild);
        }
        for (let i = 0; i < categoriesList.length; i++) {
            let node = document.createElement("LI");
            let title = document.createTextNode(categoriesList[i].title);
            let button = document.createElement("BUTTON");
            let button_icon = document.createElement("SPAN");
            button_icon.setAttribute("class","icon-pencil");
            button.appendChild(button_icon);

            button.setAttribute("data-key", categoriesList[i]._key);
            button.setAttribute("class","transparent");
            node.appendChild(title);
            node.appendChild(button);

            button.addEventListener("click", function () {
                loadCategory(this.getAttribute("data-key"));
                return true;
            });
            elem.appendChild(node);
        }
    }
}
/**
 * Updates a single SELECT DOM element with the list of categories
 * @param categoriesList
 * @param elem SELECT DOM element
 */
function updateCategoriesSelect(categoriesList, elem) {
    if(elem) {
        while (elem.hasChildNodes()) {
            elem.removeChild(elem.firstChild);
        }
        for(let i = 0; i < categoriesList.length; i++) {
            let node = document.createElement("OPTION");
            let title = document.createTextNode(categoriesList[i].title);
            node.setAttribute("value",categoriesList[i]._key);
            node.appendChild(title);
            elem.appendChild(node);
        }
    }
}

/**
 * Loads the card into the corresponding DOM fields and prepares it for editing
 * @param key: String the firebase key of the card
 */
function loadCard(key) {
    showCardContainer();
    let card = cardsStore[key];
    cardRef = firebase.database().ref('cards/' + key);
    document.getElementById("card-title").value = card.title;
    document.getElementById("card-category").value = card.category;
    front.setContents(card.front_delta);
    back.setContents(card.back_delta);
}

/**
 * Loads the category into the corresponding DOM fields and prepares it for editing
 * @param key: String the firebase key of the category
 */
function loadCategory(key) {
    showCategoryContainer()
    let category = categoriesStore[key];
    categoryRef = firebase.database().ref('categories/' + key);
    document.getElementById("category-title").value = category.title;
    document.getElementById("category-parent").value = category.parent;
}
/**
 * Shows the card container and hides the categories container
 */
function showCardContainer() {
    const cardContainer = document.getElementById("card");
    const categoryContainer = document.getElementById("category");
    if(cardContainer.getAttribute("class") == "hide") {
        cardContainer.setAttribute("class","show");
    }
    if(categoryContainer.getAttribute("class") == "show") {
        categoryContainer.setAttribute("class","hide");
    }
}

/**
 * Shows the category container and hides the card container
 */
function showCategoryContainer() {
    const cardContainer = document.getElementById("card");
    const categoryContainer = document.getElementById("category");
    if(cardContainer.getAttribute("class") == "show") {
        cardContainer.setAttribute("class","hide");
    }
    if(categoryContainer.getAttribute("class") == "hide") {
        categoryContainer.setAttribute("class","show");
    }
}

/**
 * Saves the currently loaded card to firebase. Works both with update and create
 * @pre: cardRef has to be set if card should be updated, otherwise a new card is created
 * @post: cardRef is set to the updated / created card
 */
function saveCard() {
    const title = document.getElementById("card-title").value;
    const cat = document.getElementById("card-category").value;
    if(title && cat) {
        if(cardRef == null) { // Neue Karte wird erstellt
            cardRef = firebase.database().ref('cards').push()
        }
        cardRef.set({
            front_delta: front.getContents(),
            front_html: document.querySelector("#front-editor .ql-editor").innerHTML,
            back_delta: back.getContents(),
            back_html: document.querySelector("#back-editor .ql-editor").innerHTML,
            title: title,
            category: cat
        });

        // Set cards obj in categories
        const cardKey = cardRef.key;
        const catRef = firebase.database().ref("categories/" + cat + "/cards/" + cardKey);
        let updatedObj = {};
        updatedObj[cardKey] = true;
        catRef.update(updatedObj);

        cardRef = firebase.database().ref('cards/' + cardRef.key);
    } else {
        window.alert("Bitte gib einen Titel und eine Kategorie für die Karte an.");
    }
}
/**
 * Resets the DOM fields and the cardRef so a new blank card can be created
 * @post: cardRef points to null
 */
function initCard() {
    showCardContainer();
    cardRef = null;
    document.getElementById("card-title").value = "";
    document.getElementById("card-category").value = "";
    front.setText("");
    back.setText("");
}
/**
 * Resets the DOM fields and the categoryRef so a new blank category can be created
 * @post: categoryRef points to null
 */
function initCategory() {
    showCategoryContainer();
    categoryRef = null;
    document.getElementById("category-title").value = "";
    document.getElementById("category-parent").value = "";
}

/**
 * The currently loaded card is deleted
 * @pre: cardRef should point to the card that should be deleted
 * @post: cardRef is set to null
 */
function deleteCard() {
    if(cardRef != null) {
        const cardKey = cardRef.key;
        const cat = cardsStore[cardKey].category;
        const card = cardsStore[cardKey];
        let answer = window.confirm("Möchtest du die Karte " + card.title + " wirklich löschen?");
        if(answer == true ) {
            let catRef = firebase.database().ref("categories/" + cat + "/cards/" + cardKey);
            let updatedObj = {};
            updatedObj[cardKey] = null;
            catRef.update(updatedObj);
            cardRef.remove();
            initCard();
        }
    } else {
        window.alert("Bitte wähle eine Karte aus, welche du löschen willst.");
    }
}
/**
 * The currently loaded category and ALL it's cards are deleted
 * @pre: categoryRef should point to the card that should be deleted
 * @post: categoryRef is set to null
 */
function deleteCategory() {
    if(categoryRef != null) {

        const cat = categoriesStore[categoryRef.key];
        let cardCount;
        if(cat.cards) {
            console.log(cat.cards);
            cardCount = Object.keys(cat.cards).length;
        } else {
            cardCount = 0;
        }
        let answer = window.confirm("Möchtest du die Kategorie " + cat.title + " und ALLE ihre " + cardCount +" zugeordneten Karten wirklich löschen?");
        if(answer == true) {
            let deletedObjs = {}
            for (let key in cat.cards) {
                if (cat.cards.hasOwnProperty(key)) {
                    deletedObjs[key] = null;
                }
            }
            let cardsRoot = firebase.database().ref("cards");
            console.log(deletedObjs);
            cardsRoot.update(deletedObjs);
            categoryRef.remove();
            initCategory();
        }
    } else {
        window.alert("Bitte wähle eine Kategorie aus, welche du löschen willst.");
    }
}

/**
 * Saves the currently loaded category to firebase. Works both with update and create
 * @pre: categoryRef has to be set if category should be updated, otherwise a new category is created
 * @post: categoryRef is set to the updated / created category
 */
function saveCategory() {
    const title = document.getElementById("category-title").value;
    let parent = document.getElementById("category-parent").value;
    if(parent !== '') {
        parent = null;
    }
    if(title) {
        if(categoryRef == null) {
            categoryRef = firebase.database().ref('categories').push();
        }
        categoryRef.set({
            title: title,
            parent: parent
        });
        console.log(categoryRef.key);
        categoryRef = firebase.database().ref('categories/' + categoryRef.key);
    } else {
        window.alert("Bitte gib einen Titel für die Kategorie an.");
    }
}

/* Listener attachements */
const saveCardButton = document.getElementById("card-controls-save");
saveCardButton.addEventListener("click", saveCard);

document.getElementById("card-controls-new").addEventListener("click", initCard);
document.getElementById("cards-new").addEventListener("click", initCard);

document.getElementById("category-controls-new").addEventListener("click", initCategory);
document.getElementById("categories-new").addEventListener("click", initCategory);

const deleteCardButton = document.getElementById("card-controls-delete");
deleteCardButton.addEventListener("click", deleteCard);

const saveCategoryButton = document.getElementById("category-controls-save");
saveCategoryButton.addEventListener("click", saveCategory);

const deleteCategoryButton = document.getElementById("category-controls-delete");
deleteCategoryButton.addEventListener("click", deleteCategory);
