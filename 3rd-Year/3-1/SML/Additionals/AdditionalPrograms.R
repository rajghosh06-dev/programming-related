# Additional Programs:

# -> Generating Functions (Binomial, Poisson, Uniform, Normal and Exponential) using R programming 

## Uniform Distribution:
# Example-1:
runif(5,10,100)

# Example-2:
runif(10,0,1)

## Normal Distribution:
# Example-1:
rnorm(4, mean=70, sd=10)

# Example-2:
rnorm(5, 25, sd=sqrt(4))


## Binomial Distribution:
# Example-1:
rbinom(6,10,0.5)

## Exponential Distribution:
# Example-1:
rexp(5,10)


# -> Fit linear regression to the given data

df<-data.frame(hours=c(1,2,4,5,5,6,6,7,8,10,11,11,12,12,14),score=c(64,66,76,73,74,81,83,82,80,88,84,82,91,93,89))
head(df)

attach(df)
model = lm(score~hours) 
summary(model)                

plot(hours,score)
abline(model,col='red')


# -> Multiple linear regression

X1 <- c(70, 77, 72, 77, 74, 80, 82, 74, 72, 77, 90, 82)
X2 <- c(100, 105, 112, 105, 125, 112, 129, 125, 112, 105, 140, 129)
X3 <- c(125, 110, 118, 110, 122, 123, 121, 122, 118, 110, 128, 121)
X4 <- c(65, 70, 66, 70, 58, 68, 61, 58, 66, 70, 82, 61)
Y  <- c(77, 73, 68, 76, 73, 77, 80, 73, 72, 74, 66, 78)

model = lm(Y ~ X1 + X2 + X3 + X4)
summary(model)

