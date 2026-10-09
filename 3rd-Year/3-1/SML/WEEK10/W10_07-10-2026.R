# WEEK-10:
## Kernel SVM in R
install.packages("e1071")
library(e1071)

x = matrix(rnorm(32), 16, 2) 
y = rep(c(-1, 1), c(8, 8)) 
x[y == 1,] = x[y == 1,] + 1 
#Generating the data 
#Assigning +1 and -1 to the above data 
#bias the x variable when y =1 
dat = data.frame(x, y = as.factor(y)) #representing the above data in table form using dataframe 
svm = svm(y ~ ., data = dat, kernel = "radial",gamma=1,cost=1) 
summary(svm) 
plot(svm,dat)

## Example-1:
x = matrix(rnorm(400), 200, 2)
y = rep(c(-1, 1), c(100, 100))
x[y == 1,] = x[y == 1,] + 1
data = data.frame(x, y = as.factor(y))
svm = svm(y ~ ., data = data, kernel = "radial",gamma=1, cost=1)
summary(svm)

plot(svm,data) 


## Example-2:
x = matrix(rnorm(300), 150, 2)
y = rep(c(-1, 1), c(75, 75)) 
x[y == 1,] = x[y == 1,] + 1 
data = data.frame(x, y = as.factor(y)) 
svm = svm(y ~ ., data = data, kernel = "radial",gamma=1, cost=10) 
summary(svm) 
plot(svm,data)
