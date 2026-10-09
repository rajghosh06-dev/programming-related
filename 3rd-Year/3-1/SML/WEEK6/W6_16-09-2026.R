## Example-2:
Y=c(21.0,22.0,21.0,23.0,21.2,23.2,21.5,22.0,22.3,22.5)
X1=c(2.3,2.5,2.6,2.5,2.4,2.1,2.0,2.2,2.3,2.9)
X2=c(3.1,3.2,3.3,3.4,3.5,3.6,3.8,3.9,3.2,3.3)
X3=c(4.1,4.2,4.3,4.4,4.5,4.6,4.6,4.8,4.9,4.2)
X4=c(5,6,7,8,9,1,5,4,2,6)

## (a)
mlr=lm(Y~X1+X2+X3+X4)
summary(mlr)

## (b)
plot(mlr)

## (c)
plot(mlr,2)
Residuals = resid(mlr)
shapiro.test(Residuals)


## Example-3:
data("marketing", package = "datarium")
head(marketing, 4) #Displays first 4 values in the data
tail(marketing) #Displays last 6 values in the data
View(marketing) #Displays the total data

model = lm(sales ~ youtube + facebook + newspaper, data = marketing)
summary(model)

## (a)
plot(model)

## (b)
plot(model,2)
Residuals = resid(model)
shapiro.test(Residuals)
