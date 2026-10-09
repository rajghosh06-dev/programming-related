# WEEK-8
## Classification with SVM in R
install.packages("e1071")
library(e1071)
x = matrix(rnorm(32), 16, 2)
y = rep(c(-1, 1), c(8, 8))
x[y == 1,] = x[y == 1,] + 1
#Generating the data 
#Assigning +1 and -1 to the above data 
#bias the x variable when y =1 
dat = data.frame(x, y = as.factor(y)) #representing the above data in table form using dataframe 
svm = svm(y ~ ., data = dat, kernel = "linear",cost=10) 
summary(svm)

## Example 1:
install.packages("e1071") 
library(e1071) 
x = matrix(rnorm(60), 30, 2) 
y = rep(c(-1, 1), c(15, 15)) 
x[y == 1,] = x[y == 1,] + 1 
data = data.frame(x, y = as.factor(y)) 
svm = svm(y ~ ., data = data, kernel = "linear",cost=10) 
summary(svm)

plot(svm,data)


## Example 2:
x = matrix(rnorm(100), 50, 2)
y = rep(c(-1, 1), c(25, 25)) 
x[y == 1,] = x[y == 1,] + 1 
data = data.frame(x, y = as.factor(y)) 
svm = svm(y ~ ., data = data, kernel = "linear",cost=10) 
summary(svm)

plot(svm,data)
