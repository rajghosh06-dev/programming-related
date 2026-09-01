# WEEK-1 (cont.):
##Example3:
a = matrix(c(3,2,4,0,-4,2,1,2,1,5,0,0,3,-2,1,4,5,1,1,2,2,1,5,-1,0,1,2,2,2,1),nrow=6,ncol=5,byrow=TRUE)
a
rankA = rankMatrix(a)[1]
rankA

##Example4:
b = matrix(c(1,8,9,16,2,7,10,15,3,6,11,14,4,5,12,13),nrow=4,ncol=4,byrow=TRUE)
b
eigen(b)$values
eigen(b)$vectors

##[1.4;]
##Example1:
seq(0,5,0.5)

##[1.4]
##Example2:
carage = c(5, 7, 8, 7, 2, 2, 9, 4, 11, 12, 9, 6)
carage
carspeed = c(99,86,87,88,111,103,87,94,78,77,85,86)
carspeed

plot(carage,carspeed,main="Observation of Cars",xlab="Car age",ylab="Car speed")

abline(lm(carspeed ~ carage),col="red") #lm -> linear; abline -> function
###The x-axis shows how old the car is and y-axis shows the speed of the car when it passes. It seems that the newer the car, the faster it drives.

