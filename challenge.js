// arweave instance
const arweave = Arweave.init({host:"arweave.net",port:443,logging:!0,protocol:"https"});

// selectors
var wrapper = document.getElementById('wrapper');
var alarmHours = document.getElementById('alarm_hours');
var alarmMinutes = document.getElementById('alarm_minutes');
var alarmAMPM = document.getElementById('alarm_ampm');
var alarmDays = document.getElementById('alarm_days');
var alarmAmount = document.getElementById('alarm_amount');
var alarmDonateAddress = document.getElementById('alarm_donate_address');
var transactionHistory = document.getElementById('transaction-history');

// global variables
var tempTransaction;
var keyWallet;
var yourBalance;
var challengeTime;
var days;
var isChallenge = false;
var timeup = false;
var isImported = false;
var senconds;
var limitTime = 15;
var isSolved = false;
var puzzleNumber;

// Create alarm elements
createAlarmElements();

// Functions
function createAlarmElements(){

    for (i = 1; i <= 12; i++){
        var hourOption = document.createElement('option');
        hourOption.innerHTML = '<option value="' + i + '">' + i + '</option>';
        alarmHours.appendChild(hourOption);
    }

    for (i = 0; i < 60; i++){

        // Pad minutes
        var output;
        if (i < 10){
            output = '0' + i;
        }
        else{
            output = i;
        }

        var minuteOption = document.createElement('option');
        minuteOption.innerHTML = '<option value="' + output + '">' + output + '</option>';
        alarmMinutes.appendChild(minuteOption);
    }
}

function extractwallet() {
    const input = document.querySelector('input[type="file"]');
    if (input) {
        input.addEventListener('change', function () {
            const reader = new FileReader();
            reader.addEventListener('load', function(e) {
                keyWallet = e.target.result;
            });
            reader.onload = function() {
                keyWallet = JSON.parse(keyWallet);
                arweave.wallets.jwkToAddress(keyWallet).then((address) => {
                    arweave.wallets.getBalance(address).then((balance) => {
                        yourBalance = arweave.ar.winstonToAr(balance);
                        isImported = true;
                        document.getElementById("file").setAttribute("value", address.substring(0, 4) + "..." + address.substring(address.length - 4, address.length));                    });
                });
            }
            reader.readAsText(input.files[0]);

        }, false);
    }
}

function loadwallet () {
    $("#uploadwallet").click();
    extractwallet();
}

function displayform() {
    document.getElementById('transfer-form').style.display = "table-row";
}

function cancel() {
    document.getElementById('transfer-form').style.display = "none";
}

async function setAlarm() {

    if (alarmHours.value && alarmMinutes.value && !isChallenge
        && alarmAMPM.value && alarmDays.value && alarmDonateAddress.value && isImported){

        if (alarmHours.value < 1 && alarmHours.value > 13 ||
            alarmMinutes.value < 0 && alarmMinutes.value > 59 ||
            !(["AM", "PM"].includes(alarmAMPM.value))) {
                alert("ERROR: Wrong time. Please set it again");
                return;
            }

        var validAmount = /^\d+(?:\.\d+)?$/;
        if(!validAmount.test(alarmAmount.value)) {
            alert("ERROR: Wrong Amount. Please set it again");
            return;
        }

        if(alarmDonateAddress.value.length != 43) {
            alert("ERROR: Wrong Donate Address. Please set it again");
            return;
        }      

        // check balance if enough to take challenge
        var response = await fetch('https://arweave.net/price/0/' + alarmDonateAddress.value +'/');
        var data = await response.text()
        var total = Number(alarmAmount.value) + data / 1e12
        if(total > yourBalance) {
            alert("ERROR: You balance is insufficient. \n Your balance: " + yourBalance + "\n Amount needed: " + total);
            return;
        }

        var time = new Date();

        if (alarmAMPM.value == "PM"){
            time.setHours(alarmHours.value + 12);
        }
        else {
            time.setHours(alarmHours.value);
        }

        time.setMinutes(alarmMinutes.value);

        time.setSeconds(0);
        challengeTime = time;
        days = alarmDays.value;
        tempTransaction = {to: alarmDonateAddress.value, quantity: total}
        isChallenge = true;
        //TODO: hide the form and display the result
        document.getElementById("note").style.display = 'block';
        document.getElementById("settings").style.display = 'none';
        document.getElementById("challenging").style.display = 'block';
        transactionHistory.style.display = 'none';
        document.getElementById("puzzle-section").style.display = 'none';
        document.getElementById("time").innerHTML = (alarmHours.value + ":" + alarmMinutes.value + " " + alarmAMPM.value).toUpperCase();
        document.getElementById("date").innerHTML = (alarmDays.value + " DAYS LEFT").toUpperCase();
        
    } else {
        alert("ERROR: need to full fill all elements of form and import your wallet and make sure not challenge running");
    }
}

// Render time
function renderTimeAndChallnge(){

    // create new date object
    var time = new Date();
    var ampm = 'AM';

    // Get values
    var timeSeconds = time.getSeconds();
    var timeMinutes = time.getMinutes();
    var timeHours = time.getHours();


    // Format values
    if (timeHours > 12){
        timeHours -= 12;
        ampm = 'PM'
    }

    if (timeMinutes < 10){
        timeMinutes = '0' + timeMinutes;
    }

    if (timeSeconds < 10){
        timeSeconds = '0' + timeSeconds;
    }

    // Display time
    wrapper.innerHTML = timeHours + ':' + timeMinutes + ':' + timeSeconds + ' ' + ampm;
    var finish = false;
    if(isChallenge) {
        if(timeup) {
            if((timeSeconds - senconds) == limitTime){
                if(isSolved) {
                    if(days > 1) {
                        document.getElementById("date").innerHTML = --days + " DAYS LEFT";
                    } else {
                        Swal.fire({
                            icon: 'success',
                            title: 'Good Job! Keep moving forward',
                            showConfirmButton: false,
                            timer: 3500
                        })
                        tempTransaction = {};
                        finish = true;
                    }
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'You lose! good luck for next time',
                        showConfirmButton: false,
                        timer: 3500
                    })
                    finish = true;
                    transfer();
                }
                if(finish) {
                    document.getElementById("note").style.display = 'none';
                    document.getElementById("settings").style.display = 'block';
                    document.getElementById("challenging").style.display = 'none';
                    transactionHistory.style.display = 'block';
                    isChallenge = false;
                    finish = false;
                }
                document.getElementById("puzzle-section").style.display = 'none';
                document.getElementById("puzzle").style.color = "#228B22";
                document.getElementById("wrapper").style.color = '#00F746';
                isSolved = false;
                timeup = false;
            }
            return;
        }

        // Check if time up and finish the challange
        if (challengeTime.getHours() == timeHours && challengeTime.getMinutes() == timeMinutes && timeSeconds < limitTime) {
            timeup = true;    
            senconds = timeSeconds;
            document.getElementById("wrapper").style.color = '#FF4500';
            document.getElementById("puzzle-section").style.display = 'block';
            genPuzzle();
        }
    }
}

function genPuzzle() {
    var var1 = Math.floor((Math.random() * 100) + 1);
    var var2 = Math.floor((Math.random() * 100) + 1);
    puzzleNumber = var1 + var2;
    document.getElementById("puzzle").innerHTML = var1 + " + " + var2;
    document.getElementById("puzzle").style.color = "#fffff";
}

function solvePuzzle() {
    var result = document.getElementById("your-answer").value;
    if(result == puzzleNumber) {
        isSolved = true;
        document.getElementById("puzzle").innerHTML = "Correct !!!";
        document.getElementById("puzzle").style.color = "#228B22";
    }
}

async function transfer() {
    let transaction = await arweave.createTransaction(
        {
            target: tempTransaction.to,
            quantity: arweave.ar.arToWinston(tempTransaction.quantity)
        }, keyWallet
    );
    await arweave.transactions.sign(transaction, keyWallet);
    let response = await arweave.transactions.post(transaction);
    console.log("transfer: ", response);
    var list = document.getElementById('transaction-list');
    var newListItem = document.createElement('li');
    newListItem.innerHTML = challengeTime.toLocaleTimeString() + " - " + tempTransaction.to + " - " + tempTransaction.quantity + " - " + transaction.id;  
    list.appendChild(newListItem);
}

// render clock at first load 
renderTimeAndChallnge();
// update clock for every minute
setInterval(renderTimeAndChallnge, 1000);