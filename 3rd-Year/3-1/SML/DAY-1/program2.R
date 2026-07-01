#PRACTICE:
sample(1:100,5)

#EXAMPLE1:
rainfall = c(0.1,0.6,33.8,1.9,4.3,33.7,0.3,0.0,0.1)
rainfall
typeof(rainfall)

#EXAMPLE2:
A=c(20,22,24,25,21,26,25,26,21,25,26,24,25,25,26,25,24,25,26,25)
B=c(15,14,15,16,15,14,18,16,14,15,15,17,15,15,14,15,16,17,18,19)
A
B
A+B
A-B
A*B

#Matrix Calculations:
##If x is a matric specified by the R command: x = matrix(nrow=3, ncol=3)

x = matrix(nrow = 3, ncol = 3, data = c(1,8,2,1,5,4,3,9,6),byrow = TRUE)
x
x%*%t(x)

A = matrix(c(0,3,1,5,1,01,1,2,1),nrow = 3, ncol = 3, byrow = TRUE)
A
B = matrix(c(0,0,1,0,1,0,1,0,1),nrow = 3, ncol = 3, byrow = TRUE)
B
A+B
B+A
