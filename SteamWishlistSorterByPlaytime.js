// ==UserScript==
// @name Steam wishlist sorter by playtime from HowLongToBeat
// @version  1.1
// @include https://store.steampowered.com/wishlist*
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// @require https://code.jquery.com/ui/1.12.1/jquery-ui.js 
// @grant none
// @run-at document-idle
// ==/UserScript==


//TODO
// Скриншоты для обложки
// Подогнать длину страницы под количество элементов
// Плюха, удаляющая слова с конца, чтобы можно было находить больше игр
// Другой парсер для времени, текущий находит слишком мало
// Удалять итемы вишлиста, у которых плейтайм "--"
// Заносить в окошко инфу об играх, у которых нет плейтайма

console.log("Steam wishlist sorter by playtime from HowLongToBeat. Script is on.");

// GENERAL FUNCTIONS

function getCurrentPageUrl() 
{
    return document.location.href;
}

function sendActionAjax
(
    url,
    type,
    data = [],
    onSuccess = function () { },
) 
{
    let material = new FormData();
    $.each(data, function (key, value) {
        material.append(key, value);
    });

    $.ajax({
        type: type,
        url: url,
        data: material,
        contentType: false,
        processData: false,
        dataType: 'json',

        success: function (response) {
            onSuccess(response);
        },
        error: function (response) {
            onSuccess(response);
        },
    });
}

// HOWLONGTOBEAT SECTION

let playtimesList = [];
let notFoundGames = [];
let gamesRequested = 0;

// Делает запрос с названием игры на HLTB и обрабатывает ответ
function getPlaytimeForGameFromHLTB(gameName, appId) 
{
    gamesRequested++;
    
    sendActionAjax(
        'https://howlongtobeat.com/search_results.php?page=1',
        'POST',
        {
            'queryString': gameName,
            't': 'games',
            'sorthead': 'popular',
            'sortd': 'Normal Order',
            'plat': '',
            'length_type': 'main',
            'length_min': '',
            'length_max': '',
            'detail': '',
            'randomize': '0',
        },
        function (response) 
        {
            processResponse_HLTB(response, gameName, appId);
            console.log("Получен результат на запрос № " + gamesProcessed);
        }
        );
        
    console.log("Отправили запрос на HLTB для " + gameName);
}
    
// Получает список игр со страницы поиска HLTB и выбирает нужную по названию
function processResponse_HLTB(response, gameName, appId) 
{
    var gamesList = getDataFromResponse_HLTB(response)
    console.log("Список игр со страницы поиска HLTB:");
    console.log(gamesList);

    var game = pickMatchingGame(gamesList, gameName);
    console.log("Исходная игра: " + gameName);
    console.log("Выбранная игра:");
    console.log(game);
        
    if (game == undefined || game == null) 
    {
        notFoundGames.push({appId: appId, name: gameName});
    }

    let newPlaytimeInfo =
    {
        appId: appId,
        originalName: gameName,
        name: game.name,
        playtime: game.playtime
    }

    playtimesList.push(newPlaytimeInfo);
}

// Получает список игр со страницы поиска HLTB
function getDataFromResponse_HLTB(response) 
{
    let gamesList = [];

    var sourceHTML = response.responseText;
    var searchItemsList = $('.search_list_details', sourceHTML);

    console.log("Ответы на поисковой запрос HLTB:");
    console.log(searchItemsList);

    $.each(searchItemsList, function (index, value) {
        let name = $('a', value)[0].innerText;
        var playtime = $('div.center', value)[0].innerText;

        gamesList[index] =
        {
            name: name,
            playtime: playtime
        }
    });

    return gamesList;
}
    
// Выбирает игру из списка по названию и возвращает данные о ней
function pickMatchingGame(gamesArray, neededGame) 
{
    let pickedIndex = 0;

    $.each(gamesArray, function (index, value) 
    {
        let gameFromSearchList = value.name;

        if (neededGame == gameFromSearchList) 
        {
            pickedIndex = index;
        }
    });

    return gamesArray[pickedIndex];
}
    
// STEAM SECTION
    
// Json список с элементами вишлиста
let wishlistItemsJson = [];

let wishlistLength = document.getElementById("wishlist_item_count_value").innerText;

let pagesCount = Math.ceil(wishlistLength / 100);
let pagesLoaded = 0;

// Получает json с информацией о всех элементах вишлиста и заносит в wishlistItemsJson
function getWishlistJson() 
{
    console.log("getWishlistJson");
    console.log("pagesCount = " + pagesCount);

    for (let i = 0; i < pagesCount; i++) 
    {
        let currPage = getCurrentPageUrl();

        if (currPage.match(/#/) != null)
        {
            currPage = currPage.slice(0, currPage.indexOf('#'))
        }

        let requestString = currPage + "wishlistdata/?p=" + i;
        console.log("request string = " + requestString);

        sendActionAjax(
            requestString,
            'GET',
            {},
            function (response) {
                console.log("Succes");
                console.log(response);

                $.each(response, function (index, value) {
                    let item = { index, value };
                    wishlistItemsJson.push(item);
                });

                pagesLoaded++;
            }
        );
    }
}

 let wishlistElement;
 let wishlistItemTemplate;

 function initializeTemplateItem()
 {
    wishlistElement = document.getElementsByClassName('wishlist_row')[0];
    wishlistItemTemplate = wishlistElement.cloneNode(true);
 }

function createWishlistItemFromTemplate(wishlistItemJson)
{
    let appId = wishlistItemJson.index;
    let jsonItem = wishlistItemJson.value;

    let wishlistElement = wishlistItemTemplate.cloneNode(true);
    wishlistElement.setAttribute("data-app-id", appId);

    let content = wishlistElement.getElementsByClassName("content")[0];

    let title = content.getElementsByClassName("title")[0];
    title.innerText = jsonItem.name;
    title.href = "https://store.steampowered.com/app/" + appId;

    let capsule = wishlistElement.getElementsByClassName("capsule")[0];
    capsule.href = title.href;

    let cover = capsule.getElementsByTagName("img")[0];
    cover.src = jsonItem.capsule;

    let tags = content.getElementsByClassName("tag");
    for(let i = 0; i < 5; i++)
    {
        tags[i].innerText = jsonItem.tags[i];
    }

    let reviews = content.getElementsByClassName("game_review_summary")[0];
    reviews.innerText = jsonItem.review_desc;
    reviews.className = "value game_review_summary " + jsonItem.review_css;

    let releaseDate = content.getElementsByClassName("release_date")[0];
    releaseDate.innerText = jsonItem.release_string;

    let addedDate = content.getElementsByClassName("addedon")[0];
    addedDate.parentNode.removeChild(addedDate);

    let purchaseArea = content.getElementsByClassName("purchase_area")[0];
    purchaseArea.parentNode.removeChild(purchaseArea);

    return wishlistElement;
}

let steamWishlistItemsWrapper;
let pageContent = document.getElementsByClassName("page_content")[0];

// Создает новый враппер для вишлиста
function createSteamWishlistItemsWrapper()
{
    steamWishlistItemsWrapper = document.createElement("div");
    steamWishlistItemsWrapper.id = "wishlist-new-wrapper";
    steamWishlistItemsWrapper.style.height =  (214 * wishlistLength) + "px";
    steamWishlistItemsWrapper.style.position = "relative";
}

// Заполняет новый враппер копиями прежних элементов вишлиста
function fillSteamWishlistWrapperWithGames()
{    
     for(let i = 0; i < steamWishlistItems.length; i++)
     {
         steamWishlistItemsWrapper.appendChild(steamWishlistItems[i]);
     }
}

// Удаляет старый враппер с играми, создает новый и заполняет его копиями
function replaceSteamWishlistWrapper()
{
    createSteamWishlistItemsWrapper();
    fillSteamWishlistWrapperWithGames();

    let oldWishlistWrapper = document.getElementById("wishlist_ctn");
    pageContent.removeChild(oldWishlistWrapper);
    pageContent.appendChild(steamWishlistItemsWrapper);
}


// FINAL SECTION

let steamWishlistItems = [];
let prereleasedGames = [];

function doEverything()
{
    initializeTemplateItem();
    getWishlistJson();
    getPlaytimeAndWishlistItemsForAllGames();
    sortWishlistByPlaytime();
}

function getPlaytimeAndWishlistItemsForAllGames()
{
    if (pagesLoaded < pagesCount)
    {
        setTimeout(getPlaytimeAndWishlistItemsForAllGames, 1000);
    }
    else
    {
        for (let i = 0; i < wishlistItemsJson.length; i++)
        {
            let name = wishlistItemsJson[i].value.name;
            let appId = wishlistItemsJson[i].index;
            
            // исключаем пререлизы
            if (!(wishlistItemsJson[i].value.review_desc == "Нет обзоров"))
            {     
                name = name.replace(/[^a-zA-Z1-9 ]/g,'');               
                getPlaytimeForGameFromHLTB(name, appId);
                
                let newWishlistItem = createWishlistItemFromTemplate(wishlistItemsJson[i]);
                steamWishlistItems.push(newWishlistItem);   
            }
            else
            {
                prereleasedGames.push({appId:appId, name: name});
            }
        }

        replaceSteamWishlistWrapper();
    }
}

function sortWishlistByPlaytime()
{
    updateParsingInfo();

    if(gamesRequested <= 1)
    {
        setTimeout(sortWishlistByPlaytime, 1000);
    }
    if(gamesRequested > (notFoundGames.length + playtimesList.length))
    {
        setTimeout(sortWishlistByPlaytime, 1000);
    }
    else
    {
        console.log("Плейтаймы всех игр получены, готов загружать в итемы вишлиста");
        console.log("Массив с плейтаймами");
        console.log(playtimesList);
        console.log("Массив с плейтаймами отсортированный");
        console.log(playtimesList);
        
        normalizePlaytimes();
        playtimesList.sort(comparePlaytimes);
        
        for (let i = 0; i < playtimesList.length; i++)
        {
            console.log("ПЫТАЕМСЯ ОТСОРТИРОВАТЬ");
            let currentWishlistItem = document.querySelector('div[data-app-id="' + playtimesList[i].appId + '"]');
            currentWishlistItem.style.top = (212 * i) + "px";

            let playtime = currentWishlistItem.getElementsByClassName("purchase_container")[0];
            playtime.innerText = playtimesList[i].playtime + " Часов";
            playtime.style.color = "#fff";
            playtime.style.fontSize = "25px !important";
        }
    }  
}


function normalizePlaytimes()
{
    for(let i = 0; i < playtimesList.length; i++)
    {
        playtimesList[i].playtime = Number(((playtimesList[i].playtime).replace(/[^0-9 ]/g,'')).trim());
    }
}
function comparePlaytimes(a,b)
{
    if (a.playtime > b.playtime) 
    {
        return 1;
    }
    else
    {
        return -1;
    }
    return 0;
}
// DRAGABLE WINDOW SECTION

// Окно появляется по нажатию на ~

let baseWindow;
let headBar;
let parsingProcessInfoText;
let wishlistArraySizeText;
let closeButton;
let StartSortingButton;
let endBufferFullingButton;
let isVisible = false;


// Инициализация
addStyleSheetsToPage();
addWindowToPage();

// События
window.onkeydown = changeVisibility;

// Jquery UI Interactions
$("#drag-win").draggable({ containment: "window", handle: "#drag-bar" });
$("#drag-win").resizable({ minHeight: 350, minWidth: 200, maxHeight: 600, maxWidth: 400 });

// Скрывает или показывает окно 
function changeVisibility(event) 
{
    if (event.keyCode == 192) 
    {
        if (isVisible)
            baseWindow.style.visibility = "hidden";
        else
            baseWindow.style.visibility = "visible";

        isVisible = !isVisible
    }
}

// Скрывает окно 
function closeWindow()
{
    baseWindow.style.visibility = "hidden";
    isVisible = !isVisible;
}

// Добавляет в DOM элемент с ссылкой на таблицу стилей Jquery UI
function addStyleSheetsToPage() 
{
    let head = document.getElementsByTagName('head')[0];
    let link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css';

    head.appendChild(link);
}

// Добавляет на страницу окно 
function addWindowToPage() 
{
    createWindow();
    createHeadBar();
    createCloseButton();
    createStartSortingButton();
    createparsingProcessInfoText();

    headBar.appendChild(closeButton);
    baseWindow.appendChild(headBar);
    baseWindow.appendChild(StartSortingButton);
    baseWindow.appendChild(parsingProcessInfoText);

    let body = document.getElementsByTagName("body")[0];
    body.appendChild(baseWindow);

    baseWindow.style.visibility = "hidden";
}

// Создает окно 
function createWindow() 
{
    baseWindow = document.createElement("div");
    baseWindow.id = "drag-win";
    baseWindow.style.top = "250px";
    baseWindow.style.left = "200px";
    baseWindow.style.position = "fixed";
    baseWindow.style.zIndex = "999999";
    baseWindow.style.width = "200px";
    baseWindow.style.height = "350px";
    baseWindow.style.backgroundColor = "gainsboro";
    baseWindow.style.boxShadow = "6px 6px 5px #888888"
    baseWindow.style.borderRadius = "6px";
    baseWindow.style.border = "1px solid #4f4f4f";
}

// Создает верхнюю плашку окна 
function createHeadBar() 
{
    headBar = document.createElement("div");
    headBar.innerHTML = "Сортировщик по плейтайму";
    headBar.id = "drag-bar";
    headBar.style.width = "auto";
    headBar.style.backgroundColor = "grey";
    baseWindow.style.zIndex = "999999";
    headBar.style.top = "0";
    headBar.style.borderRadius = "6px 6px 0 0;";
    headBar.style.textAlign = "left";
    headBar.style.padding = "5px";
    headBar.style.height = "24px";
    headBar.style.cursor = "move";
}

// Создает кнопку закрытия окна 
function createCloseButton() 
{
    closeButton = document.createElement("span");
    closeButton.innerHTML = "[X]";
    closeButton.id = "btn-close";
    closeButton.style.float = "right";
    closeButton.style.cursor = "pointer";
    closeButton.style.paddingRight = "6px";

    closeButton.onclick = closeWindow;
}

// Создает кнопку "Начать сортировку"
function createStartSortingButton() 
{
    StartSortingButton = document.createElement("button");
    StartSortingButton.innerHTML = "[Начать сортировку]";
    StartSortingButton.id = "btn-start-sorting";
    StartSortingButton.style.float = "left";
    StartSortingButton.style.cursor = "pointer";
    StartSortingButton.style.paddingRight = "6px";

    StartSortingButton.onclick = 
    function()
    {
        doEverything()();
    }
}

// Создает текст с размером вишлиста
function createparsingProcessInfoText()
{
    parsingProcessInfoText = document.createElement("p");
    parsingProcessInfoText.style.color = "black";
    parsingProcessInfoText.style.paddingLeft = "5px";
}

function updateParsingInfo()
{
    parsingProcessInfoText.innerText = 
    "------------------------" + 
    "\nЗапрошено: " + gamesRequested + 
    "\nВсего ответов: " + (playtimesList.length + notFoundGames.length) + 
    "\nПолучено плейтаймов: " + playtimesList.length + 
    "\nНе найденные игры: " + notFoundGames.length;
}
