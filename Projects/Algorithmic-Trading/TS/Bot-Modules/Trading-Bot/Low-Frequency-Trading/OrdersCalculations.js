exports.newAlgorithmicTradingBotModulesOrdersCalculations = function (processIndex) {
    /*
    When we are live trading, we need to synchronize with the exchange.
    */

    let thisObject = {
        actualSizeCalculation: actualSizeCalculation,
        actualRateCalculation: actualRateCalculation,
        feesToBePaidCalculation: feesToBePaidCalculation,
        amountReceivedCalculation: amountReceivedCalculation,
        percentageFilledCalculation: percentageFilledCalculation,
        feesPaidCalculation: feesPaidCalculation,
        sizeFilledCalculation: sizeFilledCalculation,
        initialize: initialize,
        finalize: finalize
    }

    let tradingEngine
    let tradingSystem
    let sessionParameters
    let exchangeConfig = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.parentNode.parentNode.config

    return thisObject

    function initialize() {
        sessionParameters = TS.projects.foundations.globals.processConstants.CONSTANTS_BY_PROCESS_INDEX_MAP.get(processIndex).SESSION_NODE.tradingParameters
        tradingEngine = TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).SIMULATION_STATE.tradingEngine
        tradingSystem = TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).SIMULATION_STATE.tradingSystem
    }

    function finalize() {
        sessionParameters = undefined
        tradingEngine = undefined
        tradingSystem = undefined
    }

    async function actualSizeCalculation(tradingEngineStage, tradingSystemOrder, tradingEngineOrder, order, applyFeePercentage) {
        /* April 2022 - A NOTE ON THE COMMENT BELOW:
        Actually there are exchanges where is possible to trade inverse, usually on swap/perpetuals pairs.
        It means that the following is not strictly true any more */

        /*
        When we submit the order to the exchange, we do it specifying the order size
        in Base Asset. It is mandatory to be in Base Asset as per CCXT Library API and
        probably as per the Exchange API too. 
        
        The exchange might take that size or might change it a little 
        bit. For example, if it does not accept as many decimals as we are sending.

        We have also seen that for Market Orders, the exchange usually does not take
        the size requested exactly. Sometimes is a little bit less or even a little bit
        more. For Limit orders it is usually the same.

        If it happens that the size accepted  (Actual Size) is different than the 
        size requested (Size), we need to make several adjustments so that the 
        accounting synchronizes with reality.
        */

        /* This calculation needs to happen only once, the first time the order is checked. */
        if (tradingEngineOrder.orderBaseAsset.actualSize.value !== tradingEngineOrder.orderBaseAsset.actualSize.config.initialValue) { return }

        if ( order.amount !== undefined) {
            /* We receive the actual size from the exchange at the order.amount field. */
            // ORIGINAL tradingEngineOrder.orderBaseAsset.actualSize.value = order.amount // Left just in case .. 
            
            // Here we check if the market is inverse 
            // Example BTC/USD:BTC -> Calcs must be made for baseAsset in this case because
            // the contract is an inverse contract and is settled in base currency
            // If the market is spot or linear then baseAsset is equal to order.amount

            if (exchangeConfig.options !== undefined) {
                if (exchangeConfig.options.defaultType !== undefined) {
                    defaultType = exchangeConfig.options.defaultType
    
                    if (defaultType == 'inverse') {
                        tradingEngineOrder.orderBaseAsset.actualSize.value = order.amount / order.average
                        
                    } else {
                        tradingEngineOrder.orderBaseAsset.actualSize.value = order.amount
                        
                    } 
                }
            }  else {tradingEngineOrder.orderBaseAsset.actualSize.value = order.amount}


            // Uncomment when debugging
            // SA.logger.info('The order placed in OrdersCalculation is:')
            // SA.logger.info(order)


        }

        recalculateActualSize()
        recalculateSizePlaced()

        function recalculateActualSize() {
            /*
            We will recalculate the Quoted Asset Actual Size. This will also give to it an initial value. 
            In the next formula, we are using the rate of the order because we dont know yet the Actual Rate.
            This rate might be replaced afterwards for the Actual Rate when this is calculated again once
            the Actual Rate is known. 
             */
            tradingEngineOrder.orderQuotedAsset.actualSize.value = tradingEngineOrder.orderBaseAsset.actualSize.value * tradingEngineOrder.rate.value

            tradingEngineOrder.orderBaseAsset.actualSize.value = TS.projects.foundations.utilities.miscellaneousFunctions.truncateToThisPrecision(tradingEngineOrder.orderBaseAsset.actualSize.value, 10)
            tradingEngineOrder.orderQuotedAsset.actualSize.value = TS.projects.foundations.utilities.miscellaneousFunctions.truncateToThisPrecision(tradingEngineOrder.orderQuotedAsset.actualSize.value, 10)
        }

        function recalculateSizePlaced() {
            /* 
            We will also recalculate the Size Placed that was previously calculated with the order Size, 
            and now we will do it with the order Actual Size.
 
            We need to unaccount the previous size placed and correctly account
            for the the new actual sizes we now know.
            */
            tradingEngineStage.stageBaseAsset.sizePlaced.value =
                tradingEngineStage.stageBaseAsset.sizePlaced.value -
                tradingEngineOrder.orderBaseAsset.size.value

            tradingEngineStage.stageBaseAsset.sizePlaced.value =
                tradingEngineStage.stageBaseAsset.sizePlaced.value +
                tradingEngineOrder.orderBaseAsset.actualSize.value

            tradingEngineStage.stageQuotedAsset.sizePlaced.value =
                tradingEngineStage.stageQuotedAsset.sizePlaced.value -
                tradingEngineOrder.orderQuotedAsset.size.value

            tradingEngineStage.stageQuotedAsset.sizePlaced.value =
                tradingEngineStage.stageQuotedAsset.sizePlaced.value +
                tradingEngineOrder.orderQuotedAsset.actualSize.value

            tradingEngineStage.stageBaseAsset.sizePlaced.value = TS.projects.foundations.utilities.miscellaneousFunctions.truncateToThisPrecision(tradingEngineStage.stageBaseAsset.sizePlaced.value, 10)
            tradingEngineStage.stageQuotedAsset.sizePlaced.value = TS.projects.foundations.utilities.miscellaneousFunctions.truncateToThisPrecision(tradingEngineStage.stageQuotedAsset.sizePlaced.value, 10)
        }
    }

    async function actualRateCalculation(tradingEngineStage, tradingSystemOrder, tradingEngineOrder, order, applyFeePercentage) {
        /* 
        Actual Rate Calculation: Let's remember that the exchange may not take the rate
        we send it with the order (in Limit orders) and for any reason change it a little bit.
        For example we might have sent a rate with too many decimals and the exchange truncate
        them. Another thing that might happen is that we send a rate that is matching orders already
        at the order book. In this case we would get an actual rate not only different than the one 
        we sent, but also, better since the trading engine inside the exchange would match orders
        with the first orders best by price. 
        
        In the case of Market Orders we don't even send a rate. For all those reason 
        we get and store the Actual Rate at which the order was filled. 
        */
        if (order.average !== undefined) {
            /*
            We will use the average whenever is available. As of today it is not 100% clear when this is
            available, but it seems sometimes it is not. In those cases we use the price.
            */
            // ORIGINAL tradingEngineOrder.orderStatistics.actualRate.value = order.average

            // Here we check if the market is inverse 
            // Example BTC/USD:BTC -> Calcs must be made for baseAsset in this case because
            // the contract is an inverse contract and is settled in base currency
            
            if (exchangeConfig.options !== undefined) {
                if (exchangeConfig.options.defaultType !== undefined) {
                    defaultType = exchangeConfig.options.defaultType
    
                    if (defaultType == 'inverse') {
                        tradingEngineOrder.orderStatistics.actualRate.value = order.amount / order.average
                        
                    } else {
                        tradingEngineOrder.orderStatistics.actualRate.value = order.average
                        
                    } 
                }
            }  else {tradingEngineOrder.orderStatistics.actualRate.value = order.average}



        } else if (order.price !== undefined) {
            /*
            We use the order.price when the average is not available.
            */
            // ORIGINAL tradingEngineOrder.orderStatistics.actualRate.value = order.price


            if (exchangeConfig.options !== undefined) {
                if (exchangeConfig.options.defaultType !== undefined) {
                    defaultType = exchangeConfig.options.defaultType
    
                    if (defaultType == 'inverse') {
                        tradingEngineOrder.orderStatistics.actualRate.value = order.amount / order.price
                        // SA.logger.info('ORDER AMOUNT/AVERAGE CALCS: ' + tradingEngineOrder.orderBaseAsset.actualSize.value)
                    } else {
                        tradingEngineOrder.orderStatistics.actualRate.value = order.price
                        // SA.logger.info('STD CALCS: ' + tradingEngineOrder.orderBaseAsset.actualSize.value)
                    } 
                }
            }  else {tradingEngineOrder.orderStatistics.actualRate.value = order.price}


        }

        tradingEngineOrder.orderStatistics.actualRate.value = TS.projects.foundations.utilities.miscellaneousFunctions.truncateToThisPrecision(tradingEngineOrder.orderStatistics.actualRate.value, 10)

        /*
        If the Actual Rate happens to be exactly the same than the order rate, then there is
        nothing else to do here. Otherwise there are adjustments to be made.
        */
        if (tradingEngineOrder.orderStatistics.actualRate.value === tradingEngineOrder.rate.value) { return }

        let previousQuotedAssetActualSize = tradingEngineOrder.orderQuotedAsset.actualSize.value

        recalculateActualSize()
        recalculateSizePlaced()

        function recalculateActualSize() {
            /*
            Now we know the Actual Rate at which the order was filled. Since the actual rate
            is not the same as the Rate we defined for the order, we need to synchronize
            the Actual Order Size for Quoted Asset since it was calculated with the Order Size that we 
            now know it is not the one really used at the exchange. We will recalculate the
            Actual Size in Quoted Asset and not in Base Asset, since the Actual Size in Base Asset 
            is the one we accepted by the exchange, so that is fixed, regardless of how we initially
            got the Order Size in Base Asset, either from direct input from the user or calculated
            from the Order Size in Quoted Asset input it by the user. So here we go. 
            */
            previousQuotedAssetActualSize = tradingEngineOrder.orderQuotedAsset.actualSize.value

            tradingEngineOrder.orderQuotedAsset.actualSize.value =
                tradingEngineOrder.orderBaseAsset.actualSize.value *
                tradingEngineOrder.orderStatistics.actualRate.value

            tradingEngineOrder.orderQuotedAsset.actualSize.value = TS.projects.foundations.utilities.miscellaneousFunctions.truncateToThisPrecision(tradingEngineOrder.orderQuotedAsset.actualSize.value, 10)

            const message = 'Calculating - Actual Size Recalculated'
            let docs = {
                project: 'Foundations',
                category: 'Topic',
                type: 'TS LF Trading Bot Warning - ' + message,
                placeholder: {}
            }
            contextInfo = {
                previousQuotedAssetActualSize: previousQuotedAssetActualSize,
                recalculatedQuotedAssetActualSize: tradingEngineOrder.orderQuotedAsset.actualSize.value,
                actualRate: tradingEngineOrder.orderStatistics.actualRate.value,
                orderRate: tradingEngineOrder.rate.value
            }
            TS.projects.education.utilities.docsFunctions.buildPlaceholder(docs, undefined, undefined, undefined, undefined, undefined, contextInfo)

            tradingSystem.addWarning(
                [
                    [tradingEngineOrder.orderQuotedAsset.actualSize.id, tradingEngineOrder.orderStatistics.actualRate.id],
                    message,
                    docs
                ]
            )
        }

        function recalculateSizePlaced() {
            let previousStageQuotedAssetSizePlaced = tradingEngineStage.stageQuotedAsset.sizePlaced.value
            /*
            Since we changed the Actual Size in Quoted Asset, we need to fix the Size Placed in Quoted Asset
            that was previously calculated with the previous value of actualSize.
            */
            tradingEngineStage.stageQuotedAsset.sizePlaced.value =
                tradingEngineStage.stageQuotedAsset.sizePlaced.value -
                previousQuotedAssetActualSize

            tradingEngineStage.stageQuotedAsset.sizePlaced.value =
                tradingEngineStage.stageQuotedAsset.sizePlaced.value +
                tradingEngineOrder.orderQuotedAsset.actualSize.value

            tradingEngineStage.stageQuotedAsset.sizePlaced.value = TS.projects.foundations.utilities.miscellaneousFunctions.truncateToThisPrecision(tradingEngineStage.stageQuotedAsset.sizePlaced.value, 10)

            const message = 'Calculating - Size Placed Recalculated'
            let docs = {
                project: 'Foundations',
                category: 'Topic',
                type: 'TS LF Trading Bot Warning - ' + message,
                placeholder: {}
            }
            contextInfo = {
                previousStageQuotedAssetSizePlaced: previousStageQuotedAssetSizePlaced,
                recalculatedStageQuotedAssetSizePlaced: tradingEngineStage.stageQuotedAsset.sizePlaced.value,
                actualRate: tradingEngineOrder.orderStatistics.actualRate.value,
                orderRate: tradingEngineOrder.rate.value
            }
            TS.projects.education.utilities.docsFunctions.buildPlaceholder(docs, undefined, undefined, undefined, undefined, undefined, contextInfo)

            tradingSystem.addWarning(
                [
                    [tradingEngineStage.stageQuotedAsset.sizePlaced.id, tradingEngineOrder.orderStatistics.actualRate.id],
                    message,
                    docs
                ]
            )
        }
    }

    async function feesToBePaidCalculation(tradingEngineStage, tradingSystemOrder, tradingEngineOrder, order, applyFeePercentage) {
        /* 
        The Fees To Be Paid are the fees that will be paid once the order is 100% Filled. 
        */
        switch (tradingEngineOrder.type) {
            case 'Market Order': {
                await applyFeePercentage(
                    'feesToBePaid',
                    tradingEngineOrder,
                    tradingSystemOrder,
                    sessionParameters.feeStructure.config.taker,
                    100
                )
                break
            }
            case 'Limit Order': {
                await applyFeePercentage(
                    'feesToBePaid',
                    tradingEngineOrder,
                    tradingSystemOrder,
                    sessionParameters.feeStructure.config.maker,
                    100
                )
                break
            }
        }
    }

    async function percentageFilledCalculation(tradingEngineStage, tradingSystemOrder, tradingEngineOrder, order, applyFeePercentage) {
        /* 
        Percentage Filled Calculation: The only relevant information we get from the exchange is the order.filled.
        We know this field will go up until reaching the Actual Size. Once it reaches that number
        the order will be 100% filled. 
        */
        if (order.filled !== undefined) {
            tradingEngineOrder.orderStatistics.percentageFilled.value = order.filled * 100 / tradingEngineOrder.orderBaseAsset.actualSize.value
            tradingEngineOrder.orderStatistics.percentageFilled.value = TS.projects.foundations.utilities.miscellaneousFunctions.truncateToThisPrecision(tradingEngineOrder.orderStatistics.percentageFilled.value, 10)
        }
    }

    async function feesPaidCalculation(tradingEngineStage, tradingSystemOrder, tradingEngineOrder, order, applyFeePercentage) {
        /*
        Within the order information received from the exchange we can not see the fees paid so we need to
        calculate them ourselves. Knowing the Fees Paid is critical to later update the balances correctly,
        since at every trade we will receive less than just the Actual Size. In fact we will receive the Actual
        Size minus the Fees Paid.

        The percentage at which the exchange will charge fees needs to be configured at the the Session Fees Parameters.        
        */
        switch (tradingEngineOrder.type) {
            case 'Market Order': {
                await applyFeePercentage(
                    'feesPaid',
                    tradingEngineOrder,
                    tradingSystemOrder,
                    sessionParameters.feeStructure.config.taker,
                    tradingEngineOrder.orderStatistics.percentageFilled.value
                )
                break
            }
            case 'Limit Order': {
                await applyFeePercentage(
                    'feesPaid',
                    tradingEngineOrder,
                    tradingSystemOrder,
                    sessionParameters.feeStructure.config.maker,
                    tradingEngineOrder.orderStatistics.percentageFilled.value
                )
                break
            }
        }
    }

    async function sizeFilledCalculation(tradingEngineStage, tradingSystemOrder, tradingEngineOrder, order, applyFeePercentage) {
        /* 
        CCXT returns order.filled with an amount denominated in Base Asset. We will
        take it from there for our Order Base Asset. The amount in order.filled does
        not reflect the Fees Paid, even if we are paying the fees in Base Asset. 
        */
        if (order.filled !== undefined) {
            tradingEngineOrder.orderBaseAsset.sizeFilled.value = order.filled
            tradingEngineOrder.orderBaseAsset.sizeFilled.value = TS.projects.foundations.utilities.miscellaneousFunctions.truncateToThisPrecision(tradingEngineOrder.orderBaseAsset.sizeFilled.value, 10)
        }
        /*
        For Quoted Asset, CCXT does not return any field with the size filled, so we 
        need to calculate that by ourselves. 
        */
        tradingEngineOrder.orderQuotedAsset.sizeFilled.value =
            tradingEngineOrder.orderQuotedAsset.actualSize.value * tradingEngineOrder.orderStatistics.percentageFilled.value / 100

        tradingEngineOrder.orderQuotedAsset.sizeFilled.value = TS.projects.foundations.utilities.miscellaneousFunctions.truncateToThisPrecision(tradingEngineOrder.orderQuotedAsset.sizeFilled.value, 10)
    }

    async function amountReceivedCalculation(tradingEngineStage, tradingSystemOrder, tradingEngineOrder, order, applyFeePercentage) {
        /* 
        This calculation is for informational purposes, so that users do not have to calculate
        it by themselves. The Amount Received out of the trade depends if we are Buying or Selling
        the Base Asset. If we are Buying, then the Amount Received will be in Base Asset. If we
        are selling then it will be in Quoted Asset. 
        */

        switch (true) {
            case tradingSystemOrder.type === 'Market Buy Order' || tradingSystemOrder.type === 'Limit Buy Order': {
                /*
                In this case the Amount Received is in Base Asset.
                */
                tradingEngineOrder.orderBaseAsset.amountReceived.value =
                    tradingEngineOrder.orderBaseAsset.sizeFilled.value -
                    tradingEngineOrder.orderBaseAsset.feesPaid.value
                break
            }
            case tradingSystemOrder.type === 'Market Sell Order' || tradingSystemOrder.type === 'Limit Sell Order': {
                /*
                In this case the Amount Received is in Quoted Asset.
                */
                tradingEngineOrder.orderQuotedAsset.amountReceived.value =
                    tradingEngineOrder.orderQuotedAsset.sizeFilled.value -
                    tradingEngineOrder.orderQuotedAsset.feesPaid.value
                break
            }
        }
    }
}
