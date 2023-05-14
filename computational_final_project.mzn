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

solve minimize total_cost;