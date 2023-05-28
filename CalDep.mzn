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

output ["Total cost: \(total_cost)\n"];
output [ if j == 1 then "\n" else " " endif ++ show(Cal[i, j]) 
         | i in 1..number_of_dates, j in 1..n ];