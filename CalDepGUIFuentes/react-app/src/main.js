import * as MiniZinc from 'minizinc';

async function RunModel(file) {
    const modelSpecification = `
    %parameters
int: n; %number of total teams
array[1..n, 1..n] of int: d; %matriz of distances between teams
int: min;
int: max;

int: number_of_dates = 2*(n-1);

%variables
array[1..2*(n-1), 1..n] of var -n..n: Cal; %matriz of calendar
set of int: values = 1..n;

% If one team play as visitor the rival is a local and if plays as local the rival is a visitor
constraint forall(i, j, k in 1..n) (((Cal[i,j] = k) -> (Cal[i,k] = -j)) /\ ((Cal[i,k] = -j) -> (Cal[i,j] = k)));

% All posible values in calendar are existing teams
constraint forall(i in 1..number_of_dates) (
forall(j in 1..n) (
    abs(Cal[i,j]) in values
  ));

% There is not two same games in a row
constraint forall(i in 1..(number_of_dates-1)) (
  forall(j in 1..n) (
    abs(Cal[i,j]) != abs(Cal[i+1,j]) 
  )
);

% Add constraints for maximum permanence and maximum tour
constraint forall (p in 1..n) (forall(i in 1..number_of_dates-(max))(
  sum(j in i..i+max) (if Cal[j, p] > 0 then 1 else 0 endif) <= max /\
  sum(j in i..i+max) (if Cal[j, p] < 0 then 1 else 0 endif) <= max
));    

% Add constraints for minimum permanence or minimun tour 
constraint forall(date in 1..number_of_dates-1, team in 1..n where Cal[date, team] < 0 /\ Cal[date+1, team] > 0) (
  date-(min-1) >= 1 /\ Cal[date, team] < 0 /\ Cal[date-(min-1), team] < 0 /\ not (date+1 >= number_of_dates)
);

constraint forall(date in 1..number_of_dates-1, team in 1..n where Cal[date, team] > 0 /\ Cal[date+1, team] < 0) (
  date-(min-1) >= 1 /\ Cal[date, team] > 0 /\ Cal[date-(min-1), team] > 0 /\ not (date+1 >= number_of_dates)
);

% On each day half of the teams has to play as visitors a the other half as locals
constraint forall(i in 1..number_of_dates) (
  (sum(j in 1..n)(if Cal[i, j] < 0 then 1 else 0 endif) == n/2) /\
  (sum(j in 1..n)(if Cal[i, j] > 0 then 1 else 0 endif) == n/2)
);

var int: total_cost = sum(i in 1..number_of_dates, t in 1..n)( 
  if i+1 <= number_of_dates then
    
    if (Cal[i, t] < 0) /\ (Cal[i+1, t] < 0) then
      d[abs(Cal[i,t]), abs(Cal[i+1, t])]
      
    elseif (Cal[i, t] < 0) /\ (Cal[i+1, t] > 0) then
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
) + sum(t in 1..n)( if Cal[1, t] < 0 then d[t, abs(Cal[1, t])] else d[t,t] endif );

solve minimize total_cost; `



    const ERRINVALIDFILEFORMAT = "error invalid file format"
    let instancesRunning = 0

    function getInteger(input) {
        let number = parseInt(input)

        if (isNaN(number) || number < 0 || !Number.isInteger(number)) {
            return ERRINVALIDFILEFORMAT
        }

        return number
    }

    function getRowsReady(input) {
        input = input.trim()
        let rows = input.split(/\r\n|\n/)

        for (let i = 0; i < rows.length; i++) {
            rows[i] = rows[i].trim()
        }

        return rows
    }

    function getThreeFirstValues(rows) {
        let vals = []

        for (let i = 0; i < 3; i++) {
            let number = getInteger(rows[i])
            if (number === ERRINVALIDFILEFORMAT) {
                return ERRINVALIDFILEFORMAT
            }

            vals.push(number)
        }

        return vals
    }

    function getTeamCosts(rows, numberOfTeams) {
        const costs = []

        for (let i = 3; i < rows.length; i++) {
            let row = rows[i]

            let columns = row.split(" ")
            if (columns.length < numberOfTeams) {
                return ERRINVALIDFILEFORMAT
            }

            let costsRow = []
            for (let j = 0; j < columns.length; j++) {
                let number = getInteger(columns[j])
                if (number === ERRINVALIDFILEFORMAT) {
                    return ERRINVALIDFILEFORMAT
                }

                costsRow.push(number)
            }

            costs.push(costsRow)
        }

        return costs
    }
    function translateToMinizinc(threeFirstRows, costs){
        let distancePerTeam = `[`
        
        for (let i = 0; i < costs.length; i++) {
          const row = costs[i];
      
          let rowValue = `|`
          for (let j = 0; j < row.length; j++) {
            const col = row[j];
            rowValue += ` ${col},`
          }
      
          rowValue += '\n'
          distancePerTeam += rowValue
        }
      
        distancePerTeam += ' |]'
      
        return   `n = ${threeFirstRows[0]};
        d = ${distancePerTeam};
        min = ${threeFirstRows[1]};
        max = ${threeFirstRows[2]};
        `
      }

    function translateInput(input) {
        const rows = getRowsReady(input)

        if (rows.length <= 3) {
            return ERRINVALIDFILEFORMAT
        }


        let threeFirstValues = getThreeFirstValues(rows)
        if (threeFirstValues === ERRINVALIDFILEFORMAT) {
            return ERRINVALIDFILEFORMAT
        }

        let numberOfTeams = getInteger(threeFirstValues[0])

        if (rows.length < 3 + numberOfTeams) {
            return ERRINVALIDFILEFORMAT
        }

        let teamsCosts = getTeamCosts(rows, numberOfTeams)
        if (teamsCosts === ERRINVALIDFILEFORMAT) {
            return ERRINVALIDFILEFORMAT
        }

        return translateToMinizinc(threeFirstValues, teamsCosts)
    }


    async function getModelReady() {
        const modelData = await file.text()


        let res = translateInput(modelData)
        if (res === ERRINVALIDFILEFORMAT) {
            throw ERRINVALIDFILEFORMAT
        }

        const model = new MiniZinc.Model();

        model.addDznString(res);
        model.addFile('model.mzn', modelSpecification);

        return model
    }

    function solveModel(model) {
        // const solve = model.solve({
        //     options: {
        //         solver: 'gecode',
        //         'all-solutions': true
        //     }
        // });

        console.log(model)

        // solve.on('solution', solution => {
        //     console.log(solution.output.json);
        // });

        // solve.then(result => {
        //     console.log(result.status);
        // });
    }

    try {
        const model = await getModelReady()
        solveModel(model)

    } catch (e) {
        instancesRunning = 0
        console.log("failure")
        console.error(e)
        if (e === ERRINVALIDFILEFORMAT) {
            window.alert(ERRINVALIDFILEFORMAT)
        }
    }


}
export default RunModel;