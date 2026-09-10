# WEEK-6
# REGRESSION
##  Simple Linear Regression:
### y = a + bx
### where y = Depended Variable; a = intercept; b = slope

##  Multiple Linear Regression:
### y = alpha + beta1.x1 + beta2.x2 + beta3.x3 + ....
### where alpha = Intercept; beta = slope; x1, x2, x3, .... = variables

## Residual Value:
### Residual value [ERROR] = Actual Value - Predicted Value

## Normality:
### Residual should follow N-Distribution

## Multi-collinearity:
### Two or more independent variable are highly correlated with each other
### Indicator = Variance Inflation Factor [VIF]
###   if VIF close to 1 => NO or little collinearity
###   if VIF below 1 and 5 => Acceptable Collinearity
###   if VIF greater than 5 => Possible Multi-Collinearity
###   if VIF > 10 => Serious Multi-collinearity

## Example-1:
Diameter = c(18.1, 19.6, 16.6, 16.4, 16.9, 17.0, 20.0, 16.6, 16.2, 18.5, 18.7, 19.4, 17.6, 18.3, 18.8)
Age = c(35, 36, 34, 35, 36, 32, 35, 38, 39, 34, 32, 31, 35, 36, 32)
Elevation = c(1.5, 1.2, 2.1, 2.3, 2.5, 1.6, 1.5, 1.4, 2.3, 2.5, 2.6, 1.2, 1.3, 1.8, 1.9)
Rainfall = c(110, 115, 80, 89, 78, 54, 86, 110, 118, 119, 200, 240, 210, 110, 118)
Gravity = c(0.63, 0.59, 0.56, 0.55, 0.54, 0.59, 0.56, 0.46, 0.63, 0.60, 0.63, 0.58, 0.55, 0.57, 0.62)



## (a)
MLR=lm(Diameter~Age+Elevation+Rainfall+Gravity)
summary(MLR)

## (b)
plot(MLR)

## (c)
install.packages("caTools") # For Linear regression
install.packages('car')   # To check multi-collinearity  
install.packages("quantmod") 
install.packages("MASS") 
install.packages("corrplot")   # plot correlation plot 
library(caTools) 
library(car) 
library(quantmod) 
library(MASS) 
library(corrplot)
vif(MLR)
### Inference: No factor is having > 10. Hence there is no Multicollinerarity.

## (d)
Residuals=resid(MLR)
Predicted=predict(MLR)
Residuals
Predicted
plot(Residuals,Predicted)

## (e)
plot(MLR,2)
shapiro.test(Residuals) 
