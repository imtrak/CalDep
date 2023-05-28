const modelSpecification = `
%parameters
int: n; %number of total teams
constraint assert( n > 0, "Error: Debe haber por lo menos dos equipos");
constraint assert( n mod 2 == 0, "Error: El numero de equipos debe ser par");

int: min;
int: max;
constraint assert( min > 0, "Error: el minimo de tour o permanencia debe ser mayor que 0");
constraint assert( max > 0, "Error: el maximo de tour o permanencia debe ser mayor que 0");
constraint assert( min < max, "Error: el maximo de tour o permanencia debe ser mayor que el minimo de tour o permanencia");

array[1..n, 1..n] of int: d; %matriz of distances between teams

int: number_of_dates = 2*(n-1);

%variables
array[1..2*(n-1), 1..n] of var -n..n: Cal; %matriz of calendar
set of int: values = 1..n;

% If one team play as visitor the rival is a local and if plays as local the rival is a visitor
constraint forall(j, k in 1..n, i in 1..number_of_dates) (
  ((Cal[i,j] = k) -> (Cal[i,k] = -j)) /\\ ((Cal[i,k] = -j) -> (Cal[i,j] = k))
);

% All posible values in calendar are existing teams
constraint forall(i in 1..number_of_dates) (
forall(j in 1..n) (
    abs(Cal[i,j]) in values
  )
);

% There is not two same games in a row
constraint forall(i in 1..(number_of_dates-1)) (
  forall(j in 1..n) (
    abs(Cal[i,j]) != abs(Cal[i+1,j]) 
  )
);

% Add constraints for maximum permanence and maximum tour
constraint forall (p in 1..n) (forall(i in 1..number_of_dates-(max))(
  (sum(j in i..i+max) (if Cal[j, p] > 0 then 
  1 
  else 
  0 
  endif) <= max) /\\
  (sum(j in i..i+max) (if Cal[j, p] < 0 then
  1 
  else 
  0 endif) <= max)
  )
);    

% Add constraints for minimum permanence or minimun tour 
constraint forall(team in 1..n, date in 1..number_of_dates)(
    exists(dateOne in 1..number_of_dates, 
           dateTwo in 1..number_of_dates where 
           (dateOne <= date) /\\ 
           (dateTwo >= date)
        )
        (
        dateTwo - dateOne + 1 >= min
        /\\
        forall(inRangeDate in dateOne..dateTwo)(
          Cal[inRangeDate, team] > 0
        )  
        \\/
        forall(inRangeDate in dateOne..dateTwo)(
          Cal[inRangeDate, team] < 0
        )
    )
);


% for each team there has to be two matches, one as visitor and other as local
constraint forall(team in values)(
      forall(k in values where k != team)(
            exists(dateOne in 1..number_of_dates, dateTwo in 1..number_of_dates)(
              (Cal[dateOne,team] == k) /\\
              (Cal[dateTwo,team] == -1*k)
            )
      )
);

% On each day half of the teams has to play as visitors a the other half as locals
constraint forall(i in 1..number_of_dates) (
  (sum(j in 1..n)(if Cal[i, j] < 0 then 
  1 
  else 
  0 endif) == n/2) /\\
  (sum(j in 1..n)(if Cal[i, j] > 0 then 
  1 
  else 
  0 endif) == n/2)
);

var int: total_cost;
constraint total_cost = sum(i in 1..number_of_dates, t in 1..n)( 
  if i+1 <= number_of_dates then
    
    if (Cal[i, t] < 0) /\\ (Cal[i+1, t] < 0) then
      d[abs(Cal[i,t]), 
      abs(Cal[i+1, t])]
      
    elseif (Cal[i, t] < 0) /\\ (Cal[i+1, t] > 0) then
      d[t, abs(Cal[i, t])]
      
    elseif (Cal[i+1, t] < 0) then 
      d[t, abs(Cal[i+1, t])]
      
    else
      d[t,t]
      
    endif
  elseif Cal[i, t] < 0 then
      d[t, abs(Cal[i, t])]
  else
    d[t,t] 
 endif
) + sum(t in 1..n)(
  if Cal[1, t] < 0 then 
  d[t, abs(Cal[1, t])] 
  else d[t,t] 
  endif );

solve minimize total_cost;
`

let instancesRunning = 0
let timeoutID

async function runModel(event) {
    event.preventDefault()

    if (instancesRunning > 0) {
        window.alert("Only one model can be running at a time")
        return
    }

    instancesRunning += 1

    try {
        model = await getModelReady()
        solveModel(model)

    } catch (e) {
        instancesRunning = 0
        showMessageForStatus("failure")
        console.error(e)
    }
}

async function getModelReady() {
    const fileInput = document.getElementById("inputFile")
    const modelData = await fileInput.files[0].text()

    let res = translateInput(modelData)

    const model = new MiniZinc.Model();

    model.addDznString(res);
    model.addFile('model.mzn', modelSpecification);

    return model
}

function solveModel(model) {
    const solve = model.solve({
        options: {
            solver: 'gecode',
            'all-solutions': true,
        }
    });
    const codeOutput = document.getElementById("outputs")

    codeOutput.innerHTML = "Loading..."

    solve.on('error', e => {
        codeOutput.innerHTML = "Fuilure"
        console.error(e)
        try {
            solve.cancel();
        } catch (e) {
            instancesRunning = 0
            console.error(e)
        }
    });

    solve.then(result => {
        const calendar = createArrayString(result.solution?.output?.json.Cal)
        codeOutput.innerHTML = "Calendario :\n" + calendar +
        "\n\nEl costo total de la solución, que corresponde a la suma de los costos de todas las giras es: " + result.solution?.output?.json.total_cost
    });

}


function showMessageForStatus(status) {
    console.log(status)
}

function translateInput(input) {
    input = input.trim()
    let rows = input.split(/\r\n|\n/)

    for (let i = 0; i < rows.length; i++) {
        rows[i] = rows[i].trim()
    }
    
    let getValues = []

    for (let i = 0; i < 3; i++) {
        let number = isCorrectInt(rows[i])
        getValues.push(number)
    }

    let numberOfTeams = isCorrectInt(getValues[0])

    let teamsCosts = getDistance(rows, numberOfTeams)

    return translateInputs(getValues, teamsCosts)
}


function isCorrectInt(input) {
    let number = parseInt(input)
    if (!Number.isInteger(number) || number < 0) {
        return "Invalid format"
    }
    return number
}

function getDistance(rows, numberOfTeams) {
    costs = []

    for (let i = 3; i < rows.length; i++) {
        let row = rows[i]

        let columns = row.split(" ")
        if (columns.length < numberOfTeams) {
            codeOutput.innerHTML = "Fuilure, invalid format"
        }

        let costsRow = []
        for (let j = 0; j < columns.length; j++) {
            let number = isCorrectInt(columns[j])

            costsRow.push(number)
        }

        costs.push(costsRow)
    }

    return costs
}

function createArrayString(array){
    let arrayString = `[`

    for (let i = 0; i < array.length; i++) {
        const row = array[i];

        let rowValue = `|`
        for (let j = 0; j < row.length; j++) {
            const col = row[j];
            rowValue += ` ${col},`
        }

        rowValue += '\n'
        arrayString += rowValue
    }

    arrayString += '|]'
    return arrayString
}

function translateInputs(threeFirstRows, costs) {
    const distancePerTeam = createArrayString(costs)

    return `n = ${threeFirstRows[0]};
      min = ${threeFirstRows[1]};
      max = ${threeFirstRows[2]};
      d = ${distancePerTeam};
      `
}
