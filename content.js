let canAssignment1 = null;
let result = null;
let canModURLs1 = null;
let URLs = [];

window.addEventListener('load', (event) => {
    if(window.location.href.includes("canvas") || window.location.href.includes("instructure.com")){
        start();
    }else{
        const canvasDOMIdentifiers = [
        "#application.ic-app",                  
        "#flash_message_holder",                
        "meta[name='apple-itunes-app'][content*='480883541']" 
        ];

        if (document.querySelector(canvasDOMIdentifiers.join(","))) {
            start();
        }else if(typeof window.ENV !== "undefined" && window.ENV.COURSE_ID !== undefined) {
            start();
        }
    }

});
    
function start(){
    const temp = document.getElementById('right-side');
    const temp2 = temp.querySelector("div.Sidebar__TodoListContainer");
    const temp3 = temp.querySelector("div.events_list");

    if (temp) {
        injectHTML(temp).then( () => runScript(temp2, temp3));
    }
}

async function runScript(temp2, temp3){
    temp2.remove();
    temp3.remove();
    
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('manager.js');
    (document.head || document.documentElement).appendChild(script)

}

async function injectHTML(temp){
    const fileUrl = chrome.runtime.getURL('injection.html');
    const response = await fetch(fileUrl);
    const htmlText = await response.text();
    temp.insertAdjacentHTML('beforeend', htmlText);
}



function findAssignments(){
        let canAssignment1 = (document.getElementsByClassName('item-group-condensed'));
        if(canAssignment1,length == 0){
            result += "nothing here";
        }
        for (let i = 0; i < canAssignment1.length; i++) {
            result += (canAssignment1[i].textContent);
        };
}





