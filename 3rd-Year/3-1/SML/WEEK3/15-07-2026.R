# [WEEK-3]
## 3.0 Acceptance/Rejection Sampling in R
install.packages("remotes")
remotes::install_github("cran/DISTRIB")
remotes::install_github("cran/AR")
install.packages("AR")

## Example-1
library(AR)

simulation = AR.Sim(n=8,
                    f_X=function(y){dunif(y,min=0,max=1)},
                    Y.dist="norm",
                    Y.dist.par=c(10,6),
                    Rej.Num=TRUE,
                    Rej.Rate=TRUE,
                    Acc.Rate=FALSE)
simulation
### Inference: In this case, rejection ratio is 0.96 significantly HIGHER when sampling from uniform distribution within interval 0,1


## Example-2
library(AR)

simulation = AR.Sim(n=8,
                    f_X=function(y){dunif(y,min=0,max=1)},
                    Y.dist="norm",
                    Y.dist.par=c(0,1),
                    Rej.Num=TRUE,
                    Rej.Rate=TRUE,
                    Acc.Rate=FALSE)
simulation
### Inference: In this case, the rejection ratio is 0.56 is not much significantly higher when sampling from Uniform distribution within the interval 0,1.

## Example-3
library(AR)

simulation = AR.Sim(n=5,
                    f_X=function(y){dunif(y,min=0,max=1)},
                    Y.dist="unif",
                    Y.dist.par=c(0,1),
                    Rej.Num=TRUE,
                    Rej.Rate=TRUE,
                    Acc.Rate=FALSE)
simulation
### Inference: In this case, the rejection ratio is 0 that is generated random numbers are from same uniform distribution. Hence, all random numbers fall within the specified distribution.

