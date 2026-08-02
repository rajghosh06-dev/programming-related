## 4.0 (Cont.)
## Example-4
Y = c(9, 3, 7, 12, 5, 15, 15, 8, 10, 3, 15, 7, 14, 10, 10, 14, 10, 9, 3, 3, 10)
lambdahat = mean(Y)
lambdahat
meanhat=lambdahat
meanhat
varhat=lambdahat
varhat

## 4.2 Testing of Hypothesis (Large Samples)
## Example-1

prop.test(20,500,0.03,alternative="two.sided")

### From the output we observe that:
#### Null Hypothesis (H0): p = 0.03
#### Alternative Hypothesis (H1): p!=0.03
#### And the p value is 0.2381 > 0.05 level of significance
#### Hence we accept Null Hypothesis
#### 95% confidence interval is (0.0252,0.0621)
#### Phat=0.04

## Example-2
prop.test(95,160,0.5,alternative="greater")

#### From the output we observe that:
#### Null Hypothesis (H0) p=0.5
#### Alternative Hypothesis (H1): p>0.5
#### And the p value is 0.01093 > 0.05 level of significance [LOS]
#### Hence we reject Null Hypothesis
#### 95% confidence interval is (0.525,1.0)
#### Phat=0.593


## Compute two-proportions of z-test (Test for difference of proportions)
## Example-1
prop.test(x=c(20,15),n=c(900,600),p=NULL,alternative="two.sided")

#### From the output we observe that:
#### Null Hypothesis (H0): p1=p2
#### Alternative Hypothesis (H1): p1!=p2
#### And the p value is 0.8164 > 0.05 level of significance
#### Hence we accept Null Hypothesis
#### 95% confidence interval is (-0.019,0.014)
#### p1hat=0.0222 p2hat=0.025

## Example-2
prop.test(x=c(490,400),n=c(500,500),p=NULL,alternative="two.sided")

#### From the output we observe that:
#### Null Hypothesis (H0): p1=p2
#### Alternative Hypothesis (H1): p1!=p2
#### And the p value is 2.2e-16 < 0.05 level of significance
#### Hence we reject Null Hypothesis
#### 95% confidence interval is (0.1408,0.2191)
#### p1hat=0.98 p2hat=0.80
