

let announcementList = [];
let datedAssignments = [];
let undatedAssignments = [];
let completedAssignments = [];
let gradedAssignments = [];

let currentSeenAnnouncements = [];
let currentUnseenAnnouncements = []
let currentDatedAssignments = [];
let currentCompletedAssignments = [];
let currentGradedAssignments = [];
let currentUndatedGradedAssignments = [];

let grades = [];

let main = document.getElementById('central-information');

let temp = document.getElementById('original-temp-text');
let courses = null;
let startingDate = null;
let endingDate = null;

let flag = false;
let flag2 = false;
let flag3 = true;

let currentlyLoading = null;
let interrupt = null;

let announcementVeiw = document.querySelector('#template-container #announcement-veiw');
let assignmentVeiw = document.querySelector('#template-container #assignment-veiw');
let gradeVeiw = document.querySelector('#template-container #grade-veiw');

let mostRecent = null;

let moduleCount = 0;
let moduleInfo = [];

const baseUrl = window.location.href; 

execute();

document.getElementById('announcement-button').addEventListener('click', () => {
    interrupt = true;
    const interval = setInterval(() => {
        if(currentlyLoading === null){
            switchVeiws(announcementVeiw);
            clearInterval(interval);
        }
    }, 10);
});
document.getElementById('assignment-button').addEventListener('click', () => {
    interrupt = true;
    const interval = setInterval(() => {
        if(currentlyLoading === null){
            switchVeiws(assignmentVeiw);
            clearInterval(interval);
        }
    }, 10);
});
document.getElementById('grade-button').addEventListener('click', () => {
    interrupt = true;
    const interval = setInterval(() => {
        if(currentlyLoading === null){
            switchVeiws(gradeVeiw);
            clearInterval(interval);
        }
    }, 10);

});

async function execute(){
    await findCourses();
    await Promise.allSettled([findAssignments(), findAnouncements(), findGrades()])
    //.then(result => assignmentToString());
    createCalendar();
    findCurrentInformation();
    switchVeiws(assignmentVeiw);
    stopLoading();
}

function stopLoading(){
    const container = document.getElementById('hidden-container');
    container.style.display = "block";
    const loading = document.getElementById('loader');
    loading.style.display = "none";
}

async function switchVeiws(templateId){
    mostRecent = templateId;
    let template = templateId;
    let clone = template.content.cloneNode(true);
    main.innerHTML = '';
    main.appendChild(clone);
    if(templateId === announcementVeiw){
        moduleCount = 0;
        moduleInfo = [];
        updateVisuals(templateId, document.getElementById('central-information').querySelector('#announcement-bar .loading-bar .inner-loading-bar'), document.getElementById('central-information').querySelector('#announcement-number'), currentUnseenAnnouncements.length, currentSeenAnnouncements.length);
        let result = "";
        for(const announcement of currentUnseenAnnouncements){
            result += createAnnouncementModule("unseenAnnouncement", announcement);
        }
        for(const announcement of currentSeenAnnouncements){
            result += createAnnouncementModule("seenAnnouncement", announcement);
        }
        const modules = document.getElementById('central-information').querySelector('#announcement-module-container');
        modules.innerHTML = result;
        giveAnnouncementModuleJavascript()
    }else if(templateId === assignmentVeiw){
        moduleCount = 0;
        moduleInfo = [];
        updateVisuals(assignmentVeiw, document.getElementById('central-information').querySelector('#dated-bar .loading-bar .inner-loading-bar'), document.getElementById('assignment-number'), currentDatedAssignments.length, currentCompletedAssignments.length);
        updateVisuals(assignmentVeiw, document.getElementById('central-information').querySelector('#undated-bar .loading-bar .inner-loading-bar'), document.getElementById('undated-assignment-number'), undatedAssignments.length, currentUndatedGradedAssignments.length);
        let result = "";
        for(const assignment of currentDatedAssignments){
            result += createAssignmentModule("datedAssignment", assignment);
        }
        for(const assignment of currentCompletedAssignments){
            result += createAssignmentModule("completedAssignment", assignment);
        }
        for(const assignment of undatedAssignments){
            result += createAssignmentModule("undatedAssignment", assignment);
        }

        const modules = document.getElementById('central-information').querySelector('#assignment-module-container');
        modules.innerHTML = result;
        giveAssigmmentModuleJavascript();
    }else if(templateId === gradeVeiw){
        moduleCount = 0;
        moduleInfo = [];
        updateGrades();
    }else{}
}

async function findCourses(){
    const courseId = `${baseUrl}/api/v1/users/self/courses?enrollment_state=active&per_page=100`;
    try {
        const response = await fetch(courseId)

        if (!response.ok) {
        throw new Error(`Canvas API Error: ${response.status} ${response.statusText}`);
        }

        courses = await response.json();


    }catch{
        console.log("couldn't find assignments");
        //temp.textContent = "their was an error1";
    }
}

async function multiFetch(endpoint){
    let assignmentResponse = await fetch(endpoint);
    result = await assignmentResponse.json();
    return result;
}

async function findAssignments (){ 
    let functionList = []
    for(const course of courses){
        const endpoint = `${baseUrl}/api/v1/courses/${JSON.stringify(course.id)}/assignments?include=submission`;
        
        functionList.push(multiFetch(endpoint)
            .then(result => {
                sortAssigments(result, course.name, course.id);
            }));
    }
    await Promise.allSettled(functionList);
}

async function sortAssigments(unsortedInfo, courseName, courseId){
    if(unsortedInfo.length >= 1){
        unsortedInfo.forEach((assignment) => {
            assignment.course_name = courseName;
            assignment.course_id = courseId;
            if(Object.hasOwn(assignment, "submission")){
                if(Object.hasOwn(assignment.submission, "grade") && assignment.submission.grade != null && assignment.submission.grade != undefined){
                    gradedAssignments.push(assignment);
                }else if(Object.hasOwn(assignment.submission, "submitted_at") && assignment.submission.submitted_at != null){
                    completedAssignments.push(assignment);
                }else if(!Object.hasOwn(assignment, "due_at") || assignment.due_at == null){
                    undatedAssignments.push(assignment);
                }else{
                    datedAssignments.push(assignment);
                }
            }
        });
    }
}

async function findAnouncements(){
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).length == 1 ? "0" + (today.getMonth() + 1) : today.getMonth() + 1;
    const day = String(today.getDate()).length == 1 ? "0" + (today.getDate()) : today.getDate();

    let functionList = [];

    for(const course of courses){
        const endpoint = `https://umd.instructure.com/api/v1/announcements?start_date=2013-01-01&end_date=${year}-${month}-${day}&context_codes[]=course_${course.id}`;
        functionList.push(multiFetch(endpoint)
            .then(result => sortAnnouncment(result, course.name, course.id)));
        
    }

    await Promise.allSettled(functionList);


}

async function sortAnnouncment(announcementResponse, courseName, courseId){
    if(announcementResponse.length >= 1){
        try{
            announcementResponse.forEach((announcement) =>{
                announcement.course_name = courseName;
                announcement.course_id = courseId;
                announcementList.push(announcement);
            });
        }catch{}
    }
}

async function findGrades(){
    const endpoint = `${baseUrl}/api/v1/users/self/courses?include[]=total_scores&enrollment_state=active`;
    multiFetch(endpoint)
        .then(result => sortGrades(result));
}

async function sortGrades(gradeResponse){
    for(const classGrade of gradeResponse){
        const tempList = [classGrade.name, classGrade.enrollments[0].computed_current_score, classGrade.enrollments[0].computed_current_letter_grade];
        grades.push(tempList);    
    }
}


async function assignmentToString(){
    let result = "announcments:";

    for(const announcement of announcementList){
        try{
            result += `title: ${announcement.title}`;
        }catch{
            result += "no title";
        }
    }
    result = result.substring(0, result.length - 1);

    result += "Dated Assignmnets:";
    for(const assignment of datedAssignments){
        try{
            //result += assignment.substring(assignment.indexOf("\"due_at\":"), assignment.indexOf("\"due_at\":") + 20)    + "\n";
            //result += assignment;
            //null, null, something
            result += `submission Grade: ${assignment.submission.grade} + "---" submitted at: ${assignment.submission.submitted_at} + "---" due at: + ${assignment.due_at} + "\n\n\n`;
        }catch{}    
    }
    result = result.substring(0, result.length - 1);

    result += "Undated Assignments";
    for(const assignment of undatedAssignments){
        try{
            //result += assignment.substring(assignment.indexOf("\"due_at\":"), assignment.indexOf("\"due_at\":") + 10) + "\n";
            //result += assignment;
            //null, null, null
            result += `submission Grade: ${assignment.submission.grade} + "---" submitted at: ${assignment.submission.submitted_at} + "---" due at: + ${assignment.due_at} + "\n\n\n`;
        }catch{}
    
    }
    result = result.substring(0, result.length - 1);

    result += "Completed Assignments";
    for(const assignment of completedAssignments){
        try{
            //result += assignment.substring(assignment.indexOf("\"grade\""), assignment.indexOf("\"grade\"") + 20) + "\n";
            //result += assignment;
            //null, date, date
            result += `submission Grade: ${assignment.submission.grade} + "---" submitted at: ${assignment.submission.submitted_at} + "---" due at: + ${assignment.due_at} + "\n\n\n`;
        }catch{}
    
    }
    result = result.substring(0, result.length - 1);

    result += "Graded Assignments";
    for(const assignment of gradedAssignments){
        try{
            //result += assignment.substring(assignment.indexOf("\"grade\""), assignment.indexOf("\"grade\"") + 20) + "\n";
            //result += assignment;
            //grade, date/null, date/null
            result += `submission Grade: ${assignment.submission.grade} + "---" submitted at: ${assignment.submission.submitted_at} + "---" due at: + ${assignment.due_at} + "\n\n\n`;
        }catch{}
    }
    result = result.substring(0, result.length - 1);
    
    temp.textContent += result;
}

function createCalendar(){
    const startDateInput = document.getElementById("date-picker-start");
    window.flatpickr(startDateInput, { 
        dateFormat: "Y-m-d H:i",
        minDate: "2013-1",
        altInput: true,
        altFormat: "j F",
        altInputClass: "custom-alt",
        defaultDate: new Date().fp_incr(-4),
        onReady: function(selectedDates, dateStr, instance){
            startingDate = new Date().fp_incr(-4);
        },
        
        onChange: function(selectedDates, dateStr, instance){
            startingDate = dateStr;
            display()
        },
    });

    const endDateInput = document.getElementById("date-picker-end");
    window.flatpickr(endDateInput, {
        dateFormat: "Y-m-d H:i",
        minDate: "2013-1",
        altInput: true,
        altFormat: "j F",
        altInputClass: "custom-alt",
        defaultDate: new Date().fp_incr(7),
        onChange: function(selectedDates, dateStr, instance){
            endingDate = dateStr;
            display();
        },

        onReady: function(selectedDates, dateStr, instance){
            endingDate = new Date().fp_incr(7);
        }
    });
}

async function display(){
    //temp.textContent = "";
    findCurrentInformation();
    switchVeiws(mostRecent);
}

function compareTwoDates(date1, date2){
    const start = JSON.stringify(date1).match(/\d+/g) || [];
    const end = JSON.stringify(date2).match(/\d+/g) || [];
    let i = 0;
    while(i < start.length && i < end.length && i < 3){
        if(start[i] < end[i]){
            return -1;
        }else if(start[i] > end[i]){
            return 1;
        }else{
            i += 1;
        }
    }
    return 0
}

function findCurrentInformation(){
    
    currentUnseenAnnouncements = [];
    currentSeenAnnouncements = [];
    currentDatedAssignments = [];
    currentCompletedAssignments = [];
    currentGradedAssignments = [];
    currentUndatedGradedAssignments = [];
    
    for(const announcement of announcementList){
        if(compareTwoDates(startingDate, announcement.posted_at) <= 0 && compareTwoDates(endingDate, announcement.posted_at) >= 0){
            if(announcement.read_state === "unread"){
                currentUnseenAnnouncements.push(announcement);
            }else{
                currentSeenAnnouncements.push(announcement);
            }
        }
    }
    for(const assignment of datedAssignments){
        if(compareTwoDates(startingDate, assignment.due_at) <= 0 && compareTwoDates(endingDate, assignment.due_at) >= 0){
            currentDatedAssignments.push(assignment);
        }
    }
    for(const assignment of completedAssignments){
        if(compareTwoDates(startingDate, assignment.due_at) <= 0 && compareTwoDates(endingDate, assignment.due_at) >= 0){
            currentCompletedAssignments.push(assignment);
        }
    }
    for(const assignment of gradedAssignments){
        if(assignment.due_at !== null && compareTwoDates(startingDate, assignment.due_at) <= 0 && compareTwoDates(endingDate, assignment.due_at) >= 0){
            currentCompletedAssignments.push(assignment);
        }
    }
    for(const assignment of gradedAssignments){
        if(compareTwoDates(startingDate, assignment.submission.graded_at) <= 0 && compareTwoDates(endingDate, assignment.submission.graded_at) >= 0){
            currentGradedAssignments.push(assignment);
        }
    }
    for(const assignment of gradedAssignments){
        if(assignment.due_at === null && compareTwoDates(startingDate, assignment.submission.graded_at) <= 0 && compareTwoDates(endingDate, assignment.submission.graded_at) >= 0){
            currentUndatedGradedAssignments.push(assignment);
        }
    }
}

function updateVisuals(templateId, progressBar, assignmentNumber, total, finished){
    interrupt = false;
    currentlyLoading = templateId;
    progressBar.style.width = "10%";
    progressBar.style.backgroundColor = `rgb(${255-Math.pow(10, 2) *255/10000}, ${0}, 0)`;
    let percentage = 100.0;

    if(total !== 0){
        percentage = `${finished / (finished + total) * 100}`;
    }

    const intervalId = setInterval(() => {
        const currentPercentage = parseInt(progressBar.style.width.substring(0, progressBar.style.width.indexOf("%")), 10);
        
        if(interrupt === true){
            currentlyLoading = null;
            clearInterval(intervalId);
        }else if(currentPercentage >= percentage){
            templateId.innerHTML = document.getElementById('central-information').innerHTML;
            currentlyLoading = null;
            clearInterval(intervalId);
        }else{
            progressBar.style.width = `${currentPercentage + 1}%`;
            if(currentPercentage <= 15){
                progressBar.style.backgroundColor = `rgb(${255-Math.pow(currentPercentage, 2) *255/10000}, ${0}, 0)`
            }
            progressBar.style.backgroundColor = `rgb(${255-Math.pow(currentPercentage, 3) *255/1000000}, ${Math.pow(currentPercentage-15, 0.33) *255/4.64 }, 0)`;

            
        }
    }, 12);

    percentage = Math.floor(percentage);
    assignmentNumber.textContent = `${finished}/${finished + total} ${percentage}%`;
}

function findNearestCharacter(str, char, initPos, defaultlength){
    inIndex = initPos;
    deIndex = initPos;
    while((inIndex < initPos + defaultlength && deIndex > initPos - defaultlength) && (inIndex < str.length && deIndex > 0)){
        if(str.substring(inIndex, inIndex + 1) == char){
            return inIndex;
        }else if(str.substring(deIndex, deIndex + 1) == char){
            return deIndex;
        }
        inIndex += 1;
        deIndex -= 1;
    }
    return initPos + defaultlength -1;

}

function updateGrades(){
    let result = "";
    for(const grade of grades){
        let title = "";
        grade[0] = grade[0].replaceAll("\n", " ");
        if(grade[0].length > 50){
            title = grade[0].substring(0, findNearestCharacter(grade[0], " ", 20, 5)) + "\n" + grade[0].substring(findNearestCharacter(grade[0], " ", 20, 5), findNearestCharacter(grade[0], " ", 40, 5)) + "\n" + grade[0].substring(findNearestCharacter(grade[0], " ", 40, 5), 50) + "...";
        }else{
            if(grade[0].length >= 40){
                title = grade[0].substring(0, findNearestCharacter(grade[0], " ", 20, 5)) + "\n" + grade[0].substring(findNearestCharacter(grade[0], " ", 20, 5), findNearestCharacter(grade[0], " ", 40, 5)) + "\n" + grade[0].substring(findNearestCharacter(grade[0], " ", 40, 5), grade[0].length);
            }else if(grade[0].length >= 20){
                title = grade[0].substring(0, findNearestCharacter(grade[0], " ", 20, 5)) + "\n" + grade[0].substring(findNearestCharacter(grade[0], " ", 20, 5), grade[0].length);
            }else {
                title = grade[0].substring(0, grade[0].length);
            }
           
        }
        let percentage = "";
        if(grade[1] === null && grade[2] === null){
            percentage = "No grade for this class";
        }else if(grade[1] === null && grade[2] !== null){
            percentage = grade[2];
        }else if(grade[1] !== null & grade[2] === null){
            percentage = grade[1] + "%"
        }else{
            percentage = grade[1] + "% " + grade[2];
        }

        result += `<div class="div-centerer individual-grade-container"><p class="grade-title">${title}</p><p class="grade-score">${percentage}</p></div>`;
    }
    const gradeContainer = document.getElementById('grade-container');
    gradeContainer.innerHTML = result;
}

function createAnnouncementModule(type, info){
    let result = "";
    let course_name = null;
    let title = null;
    const datePosted = parseDate(info.posted_at);
    if(type === "seenAnnouncement" || type === "unseenAnnouncement"){
        course_name = info.course_name;
        course_name = JSON.stringify(course_name);
        if(course_name.length > 30){
            course_name = course_name.replaceAll("\n", " ");
            course_name = course_name.substring(0, findNearestCharacter(course_name, " ", 20, 10));
            course_name += "...";
            course_name = course_name.substring(1, course_name.length);
        }
        title = info.title;
        title = JSON.stringify(title);
        title = title.replaceAll("\n", " ");
        if(title.length > 60){
            title = title.substring(0, findNearestCharacter(title, " ", 20, 10)) + "\n" + title.substring(findNearestCharacter(title, " ", 20, 10), findNearestCharacter(title, " ", 50, 10)) + "...";
        }else if(title.length > 30){
            title = title.substring(0, findNearestCharacter(title, " ", 20, 10)) + "...";
        }
        title = title.substring(1, title.length);
    }else if(type === "datedAssignment" || type === "undatedAssignment"){

    }
    if(type === "seenAnnouncement"){
        result += `<div class="module green-out" id="announcementModule${moduleCount}"><h1 class="course-name">${course_name}</h1><p class="title">${title}</p><p class="date-posted">${datePosted}</p></div>`;
    }else if(type === "unseenAnnouncement"){
        result += `<div class="module" id="announcementModule${moduleCount}"><h1 class="course-name">${course_name}</h1><p class="title">${title}</p><p class="date-posted">${datePosted}</p></div>`;
    }
    const IDs = {
        course_id: info.course_id,
        announcement_id: info.id,  
    }
    moduleInfo.push(IDs);
    moduleCount += 1;
    return result;
}



function giveAnnouncementModuleJavascript(){
    for(let i = 0; i < moduleInfo.length; i++){
        const id = "announcementModule" + i;
        document.getElementById(id).addEventListener('click', () =>{
            window.open(window.location.href + "courses/" + moduleInfo[i].course_id + "/discussion_topics/" + moduleInfo[i].announcement_id, '_blank').focus();
        });
    }
}

function createAssignmentModule(type, info){
    let result = "";
    let course_name = null;
    let name = null;
   // temp.textContent = "test";
    const datePosted = parseDate(info.due_at);

    course_name = info.course_name;
    course_name = JSON.stringify(course_name);
    if(course_name.length > 30){
        course_name = course_name.replaceAll("\n", " ");
        course_name = course_name.substring(0, findNearestCharacter(course_name, " ", 20, 10));
        course_name += "...";
        course_name = course_name.substring(1, course_name.length);
    }
    name = info.name;
    name = JSON.stringify(name);
    name = name.replaceAll("\n", " ");
    if(name.length > 60){
        name = name.substring(0, findNearestCharacter(name, " ", 20, 10)) + "\n" + name.substring(findNearestCharacter(name, " ", 20, 10), findNearestCharacter(name, " ", 50, 10)) + "...";
    }else if(name.length > 30){
        name = name.substring(0, findNearestCharacter(name, " ", 20, 10)) + "...";
    }
    name = name.substring(1, name.length);

    //<div class="module" id="announcementModule${moduleCount}"><h1 class="course-name">${course_name}</h1><p class="title">${title}</p><p class="date-posted">${datePosted}</p></div>`;
 
    if(type === "datedAssignment"){
        result += `<div class="module" id="assignmentModule${moduleCount}"><h1 class="course-name">${course_name}</h1><p class="title">${name}</p><p class="date-posted">${datePosted}</p></div>`;
    }else if(type === "completedAssignment"){
        result += `<div class="module green-out" id="assignmentModule${moduleCount}"><h1 class="course-name">${course_name}</h1><p class="title">${name}</p><p class="date-posted">${datePosted}</p></div>`;
    }else if(type === "undatedAssignment"){
        result += `<div class="module grey-out" id="assignmentModule${moduleCount}"><h1 class="course-name">${course_name}</h1><p class="title">${name}</p></div>`;
    }
    
    
    const IDs = {
        course_id: info.course_id,
        assignment_id: info.id
    };
    moduleInfo.push(IDs);
    moduleCount += 1;
    return result;
}


function giveAssigmmentModuleJavascript(){
    for(let i = 0; i < moduleInfo.length; i++){
        const id = "assignmentModule" + i;
        document.getElementById(id).addEventListener('click', () =>{
            window.open(window.location.href + "courses/" + moduleInfo[i].course_id + "/assignments/" + moduleInfo[i].assignment_id, '_blank').focus();
        });
    }
}

function parseDate(date){
    if(date === null){
        return "";
    }
    let result = "";
    
    result += date.substring(5, 7)
    
    if(result.substring(0,1) === "0"){
        result = result.substring(1,2);
    }
    
    result += "/" + date.substring(8,10) + " ";
    
    let amOrPm = null;

    let hour = parseInt(date.substring(11, 13));
    hour = (hour + 20) % 24;



    if(hour > 22){
        amOrPm = "pm";
        result += JSON.stringify(hour) - 12;
    }else if(hour > 12){
        amOrPm = "pm";
        result += JSON.stringify(hour) - 12;
    }else if(hour > 10){
        amOrPm = "am";
        result += JSON.stringify(hour);
    }else{
        amOrPm = "am";
        result += JSON.stringify(hour);
    }

    if(date.substring(14, 16) !== "00"){
        result += (":" + date.substring(14, 16));
    }
    return result + amOrPm;
}