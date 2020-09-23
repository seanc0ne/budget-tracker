// create variable to hold db connection
let db;
// establish a connection to IndexedDB database called 'budget-tracker' and set it to version 1
const request = indexedDB.open('budget-tracker', 1);
// this event will emit if the database version changes (nonexistant to version 1, v1 to v2, etc.)
request.onupgradeneeded = function (event) {
  // save a reference to the database
  const db = event.target.result;
  // create an object store (table) called 'new_budget_item', set it to have an auto incrementing primary key of sorts
  db.createObjectStore('new_budget_item', { autoIncrement: true });
};
// upon a successful
request.onsuccess = function (event) {
  // when db is successfully created with its object store (from onupgradedneeded event above) or simply established a connection, save reference to db in global variable
  db = event.target.result;
  // check if app is online - if yes, run uploadBudgetItem() function to send all local db data to api
  if (navigator.online) {
    uploadBudgetItem();
  }
};
request.onerror = function (event) {
  // log error
  console.log(event.target.errorCode);
};
// this code will be executed if we attempt to submit a new budget_item and there's no internet connection
function saveRecord(record) {
  // open a new transaction with the database with read and write permissions
  const transaction = db.transaction(['new_budget_item'], 'readwrite');
  // access the object store for 'new_budget_item'
  const budgetItemObjectStore = transaction.objectStore('new_budget_item');
  // add record to the budgetItemObjectStore store with add method
  budgetItemObjectStore.add(record);
}
// collect data from object store in IndexedDb and POST it to the server
function uploadBudgetItem() {
  // open a transaction on the db
  const transaction = db.transaction(['new_budget_item'], 'readwrite');
  // access the object store
  const budgetItemObjectStore = transaction.objectStore('new_budget_item');
  // get all records from store and set to a variable
  const getAll = budgetItemObjectStore.getAll();
  // upon a successful .getAll() execution, run this function
  getAll.onsuccess = function () {
    console.log('getAll', getAll);
    // if there was data in indexedDB's store, let's send it to the api server
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((serverResponse) => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }
          // open one more transaction
          const transaction = db.transaction(['new_budget_item'], 'readwrite');
          // access the object store
          const budgetItemObjectStore = transaction.objectStore(
            'new_budget_item'
          );
          // clear all items in the store
          budgetItemObjectStore.clear();
          alert('All saved transactions have been submitted');
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };
}
// listen for app coming back online
window.addEventListener('online', uploadBudgetItem);