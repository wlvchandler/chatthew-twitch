import bank
import baseclass

import datetime

class Stonk():
    def __init__(self, symbol=None, price=None, qty=None, last_buy=None):
        self.symbol = symbol
        self.price = price
        self.qty = qty
        self.last_buy = last_buy
        self.market_cap = self.price * self.qty

class Portfolio():
    def __init__(self, user=None, symbols=None):
        self.user = user
        self.content = symbols
        self.total_value = 0
        # for symbol in self.content:
        #     self.total_value += self.content[symbol] #* 

class Exchange(baseclass.FileLoaded):
    def __init__(self):
        super().__init__('exchange')
        self.market = {}
        self.portfolios = {}
        for symbol in self.loaded_data['stonks'].keys():
            _sym = self.loaded_data['stonks'][symbol]
            self.market[symbol] = Stonk(symbol, _sym['price'], _sym['qty'], _sym['last_buy'])
        for user in self.loaded_data['portfolios'].keys():
            _pfo = self.loaded_data['portfolios'][user]
            self.portfolios[user] = Portfolio(user, _pfo)

        self.sell = {}
        self.buy = {}

    def show_stock(self, symbol):
        if symbol in self.market.keys():
            return f'${symbol}: ${self.market[symbol].price}'
        return f'Invalid stock name: ${symbol}'
    
    def buy_stock(self, user, symbol, qty):
        self.buy[symbol].append(f'{user}#{qty}')
        self.portfolios[user].content[symbol] += qty
      

    def sell_stock(self, symbol):
        pass
    
