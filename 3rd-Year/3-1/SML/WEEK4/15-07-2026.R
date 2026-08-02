# [WEEK-4]
## 4.0 Maximum likelihood and Method of moment’s estimation. Testing of Hypothesis based on Z-test. Concept of p-value in R

## Example-1
x = c(9,2,5,3,1,5,2,4,2,1,3,5,6,1,1)
phat = mean(x)/length(x)
phat
meanhat = length(x)*phat
meanhat
varhat = length(x)*phat*(1-phat)
varhat

## Example-2
x=rpois(10,12)
lambdahat=mean(x)
lambdahat
meanhat=lambdahat
meanhat
varhat=lambdahat
varhat

## Example-3
x=c(15, 9, 3, 7, 15, 8, 10, 3, 12, 5, 15, 8, 10, 3, 15, 8, 10, 3, 15, 8, 10, 3, 15, 7, 
    14, 10, 10, 14, 10, 9, 3, 3, 10, 15, 8, 10, 3, 15, 8, 10, 3, 12, 5, 15, 8, 10, 3, 15, 8, 10, 3)
n=length(x)
n
muhat=mean(x)
muhat
sigmahat=((n - 1)/n)*var(x)
sigmahat
