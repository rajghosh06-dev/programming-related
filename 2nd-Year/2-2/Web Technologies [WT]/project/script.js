let students=[];

function addStudent(){

let name=document.getElementById("studentName").value;

if(name===""){
alert("Enter student name");
return;
}

let student={
name:name,
status:"Present"
};

students.push(student);

document.getElementById("studentName").value="";

renderTable();

}

function toggleStatus(index){

students[index].status=
students[index].status==="Present"?"Absent":"Present";

renderTable();

}

function deleteStudent(index){

students.splice(index,1);

renderTable();

}

function renderTable(){

let tbody=document.querySelector("#attendanceTable tbody");

tbody.innerHTML="";

let presentCount=0;
let absentCount=0;

students.forEach((student,index)=>{

if(student.status==="Present") presentCount++;
else absentCount++;

let row=`
<tr>

<td>${student.name}</td>

<td>
<button class="statusBtn ${student.status==="Present"?"present":"absent"}"
onclick="toggleStatus(${index})">
${student.status}
</button>
</td>

<td>
<button class="delete" onclick="deleteStudent(${index})">Delete</button>
</td>

</tr>
`;

tbody.innerHTML+=row;

});

document.getElementById("total").innerText=students.length;
document.getElementById("present").innerText=presentCount;
document.getElementById("absent").innerText=absentCount;

}

function exportPDF(){

const { jsPDF } = window.jspdf;

let doc = new jsPDF();

doc.setFontSize(18);
doc.text("Attendance Report", 20, 20);

doc.setFontSize(12);

let y=40;

doc.text("Student Name",20,y);
doc.text("Status",120,y);

y+=10;

students.forEach((student)=>{

doc.text(student.name,20,y);
doc.text(student.status,120,y);

y+=10;

});

doc.save("attendance-report.pdf");

}