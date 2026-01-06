// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract EscrowContract {
    enum EscrowStatus {
        Created,        // 0: Shipper sends request (no payment yet)
        PriceProposed,  // 1: Logistics proposed price (waiting for shipper payment)
        PriceRejected,  // 2: Logistics rejected the request
        Funded,         // 3: Shipper paid (approved and funded)
        InTransit,      // 4: Logistics delivering
        Delivered,      // 5: Logistics marked as delivered
        Completed,      // 6: Admin verified and completed
        Refunded,       // 7: Funds refunded to shipper
        Disputed        // 8: Dispute raised
    }

    struct Escrow {
        uint256 id;
        address buyer;
        address seller;
        uint256 amount;
        string destinationGPS;
        int256 minTemperature;
        int256 maxTemperature;
        int256 minHumidity;     
        int256 maxHumidity;     
        int256 minPressure;     
        int256 maxPressure;      
        uint256 deadline;
        EscrowStatus status;
        bool verified;
        uint256 createdAt;
        uint256 verifiedAt;
    }

    struct VerificationData {
        string currentGPS;
        int256 temperature;
        int256 humidity;
        int256 pressure;
        uint256 timestamp;
        bool gpsMatched;
        bool temperatureValid;
        bool humidityValid;
        bool pressureValid;
    }

    address public owner;
    address public oracle;
    uint256 public escrowCounter;
    uint256 public constant GPS_TOLERANCE = 100;

    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => VerificationData) public verifications;
    mapping(address => uint256[]) public userEscrows;

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed buyer,
        address indexed seller,
        string destinationGPS,
        uint256 deadline
    );

    event PriceProposed(
        uint256 indexed escrowId,
        address indexed seller,
        uint256 amount
    );

    event PriceRejected(
        uint256 indexed escrowId,
        address indexed seller
    );

    event EscrowFunded(uint256 indexed escrowId, uint256 amount);

    event EscrowApproved(uint256 indexed escrowId, address indexed seller);

    event DeliveryStarted(uint256 indexed escrowId, uint256 timestamp);

    event DeliveryMarked(uint256 indexed escrowId, address indexed seller);

    event VerificationRequested(
        uint256 indexed escrowId,
        address indexed requester
    );

    event DeliveryVerified(
        uint256 indexed escrowId,
        bool gpsMatched,
        bool temperatureValid,
        bool humidityValid,
        bool pressureValid,
        bool verified
    );

    event FundsReleased(
        uint256 indexed escrowId,
        address indexed recipient,
        uint256 amount
    );

    event EscrowRefunded(
        uint256 indexed escrowId,
        address indexed buyer,
        uint256 amount
    );

    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can call this function");
        _;
    }

    modifier onlyBuyer(uint256 _escrowId) {
        require(
            escrows[_escrowId].buyer == msg.sender,
            "Only buyer can call this function"
        );
        _;
    }

    modifier onlySeller(uint256 _escrowId) {
        require(
            escrows[_escrowId].seller == msg.sender,
            "Only seller can call this function"
        );
        _;
    }

    modifier escrowExists(uint256 _escrowId) {
        require(
            _escrowId > 0 && _escrowId <= escrowCounter,
            "Escrow does not exist"
        );
        _;
    }

    modifier inStatus(uint256 _escrowId, EscrowStatus _status) {
        require(escrows[_escrowId].status == _status, "Invalid escrow status");
        _;
    }

    constructor(address _oracle) {
        require(_oracle != address(0), "Oracle address cannot be zero");
        owner = msg.sender;
        oracle = _oracle;
        escrowCounter = 0;
    }

    function createEscrow(
        address _seller,
        string memory _destinationGPS,
        int256 _minTemperature,
        int256 _maxTemperature,
        int256 _minHumidity,
        int256 _maxHumidity,
        int256 _minPressure,
        int256 _maxPressure,
        uint256 _deadline
    ) external returns (uint256) {
        require(_seller != address(0), "Seller address cannot be zero");
        require(_seller != msg.sender, "Buyer cannot be seller");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(
            _minTemperature < _maxTemperature,
            "Min temp must be less than max temp"
        );
        require(
            _minHumidity < _maxHumidity,
            "Min humidity must be less than max humidity"
        );
        require(
            _minPressure < _maxPressure,
            "Min pressure must be less than max pressure"
        );
        require(
            bytes(_destinationGPS).length > 0,
            "Destination GPS is required"
        );

        escrowCounter++;
        uint256 escrowId = escrowCounter;

        escrows[escrowId] = Escrow({
            id: escrowId,
            buyer: msg.sender,
            seller: _seller,
            amount: 0, // Amount will be set by logistics
            destinationGPS: _destinationGPS,
            minTemperature: _minTemperature,
            maxTemperature: _maxTemperature,
            minHumidity: _minHumidity,
            maxHumidity: _maxHumidity,
            minPressure: _minPressure,
            maxPressure: _maxPressure,
            deadline: _deadline,
            status: EscrowStatus.Created,
            verified: false,
            createdAt: block.timestamp,
            verifiedAt: 0
        });

        userEscrows[msg.sender].push(escrowId);
        userEscrows[_seller].push(escrowId);

        emit EscrowCreated(
            escrowId,
            msg.sender,
            _seller,
            _destinationGPS,
            _deadline
        );

        return escrowId;
    }

    function setPriceAndApprove(
        uint256 _escrowId,
        uint256 _amount
    )
        external
        escrowExists(_escrowId)
        onlySeller(_escrowId)
        inStatus(_escrowId, EscrowStatus.Created)
    {
        require(_amount > 0, "Amount must be greater than 0");
        
        escrows[_escrowId].amount = _amount;
        escrows[_escrowId].status = EscrowStatus.PriceProposed;
        
        emit PriceProposed(_escrowId, msg.sender, _amount);
    }

    function rejectPrice(
        uint256 _escrowId
    )
        external
        escrowExists(_escrowId)
        onlySeller(_escrowId)
        inStatus(_escrowId, EscrowStatus.Created)
    {
        escrows[_escrowId].status = EscrowStatus.PriceRejected;
        emit PriceRejected(_escrowId, msg.sender);
    }

    function fundEscrow(
        uint256 _escrowId
    )
        external
        payable
        escrowExists(_escrowId)
        onlyBuyer(_escrowId)
        inStatus(_escrowId, EscrowStatus.PriceProposed)
    {
        Escrow storage escrow = escrows[_escrowId];
        require(msg.value == escrow.amount, "Payment amount must match proposed price");
        
        escrow.status = EscrowStatus.Funded;
        emit EscrowFunded(_escrowId, msg.value);
    }

    function approveEscrow(
        uint256 _escrowId
    )
        external
        escrowExists(_escrowId)
        onlySeller(_escrowId)
        inStatus(_escrowId, EscrowStatus.Created)
    {
        revert("Use setPriceAndApprove to set price and approve");
    }

    function startDelivery(
        uint256 _escrowId
    )
        external
        escrowExists(_escrowId)
        onlySeller(_escrowId)
        inStatus(_escrowId, EscrowStatus.Funded)
    {
        escrows[_escrowId].status = EscrowStatus.InTransit;
        emit DeliveryStarted(_escrowId, block.timestamp);
    }

    function markDelivered(
        uint256 _escrowId
    )
        external
        escrowExists(_escrowId)
        onlySeller(_escrowId)
        inStatus(_escrowId, EscrowStatus.InTransit)
    {
        escrows[_escrowId].status = EscrowStatus.Delivered;
        emit DeliveryMarked(_escrowId, msg.sender);
    }

    function requestVerification(
        uint256 _escrowId
    ) external escrowExists(_escrowId) {
        Escrow storage escrow = escrows[_escrowId];
        require(
            escrow.status == EscrowStatus.InTransit ||
                escrow.status == EscrowStatus.Delivered,
            "Escrow not in transit or delivered"
        );
        require(
            msg.sender == escrow.buyer || msg.sender == escrow.seller,
            "Only buyer or seller can request verification"
        );

        emit VerificationRequested(_escrowId, msg.sender);
    }

    function verifyDelivery(
        uint256 _escrowId,
        string memory _currentGPS,
        int256 _temperature,
        int256 _humidity,
        int256 _pressure,
        bool _gpsMatched,
        bool _temperatureValid,
        bool _humidityValid,
        bool _pressureValid
    ) external onlyOracle escrowExists(_escrowId) {
        Escrow storage escrow = escrows[_escrowId];
        require(
            escrow.status == EscrowStatus.Delivered,
            "Escrow must be in Delivered status"
        );
        require(!escrow.verified, "Escrow already verified");

        verifications[_escrowId] = VerificationData({
            currentGPS: _currentGPS,
            temperature: _temperature,
            humidity: _humidity,
            pressure: _pressure,
            timestamp: block.timestamp,
            gpsMatched: _gpsMatched,
            temperatureValid: _temperatureValid,
            humidityValid: _humidityValid,
            pressureValid: _pressureValid
        });

        bool verified = _gpsMatched && _temperatureValid && _humidityValid && _pressureValid;
        escrow.verified = verified;
        escrow.verifiedAt = block.timestamp;

        if (verified) {
            escrow.status = EscrowStatus.Completed;
            escrow.verified = true;
            _releaseFunds(_escrowId);
        }

        emit DeliveryVerified(
            _escrowId,
            _gpsMatched,
            _temperatureValid,
            _humidityValid,
            _pressureValid,
            verified
        );
    }

    function _releaseFunds(uint256 _escrowId) internal {
        Escrow storage escrow = escrows[_escrowId];
        require(
            escrow.status == EscrowStatus.Completed,
            "Invalid status for release"
        );

        uint256 amount = escrow.amount;
        address seller = escrow.seller;

        (bool success, ) = payable(seller).call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsReleased(_escrowId, seller, amount);
    }

    function refund(
        uint256 _escrowId
    ) external escrowExists(_escrowId) {
        Escrow storage escrow = escrows[_escrowId];
        require(
            escrow.status == EscrowStatus.Funded ||
                escrow.status == EscrowStatus.InTransit ||
                escrow.status == EscrowStatus.Delivered,
            "Cannot refund this escrow"
        );
        require(
            msg.sender == escrow.buyer || msg.sender == owner || msg.sender == oracle,
            "Only buyer, owner, or oracle can refund"
        );
        
        if (msg.sender == escrow.buyer) {
            require(block.timestamp > escrow.deadline, "Deadline not yet passed");
        }
        
        require(!escrow.verified, "Delivery already verified");
        require(escrow.amount > 0, "No funds to refund");

        uint256 amount = escrow.amount;
        address buyer = escrow.buyer;

        escrow.status = EscrowStatus.Refunded;

        (bool success, ) = payable(buyer).call{value: amount}("");
        require(success, "Refund failed");

        emit EscrowRefunded(_escrowId, buyer, amount);
    }

    function getEscrow(
        uint256 _escrowId
    ) external view escrowExists(_escrowId) returns (Escrow memory) {
        return escrows[_escrowId];
    }

    function getVerification(
        uint256 _escrowId
    ) external view escrowExists(_escrowId) returns (VerificationData memory) {
        return verifications[_escrowId];
    }

    function getUserEscrows(
        address _user
    ) external view returns (uint256[] memory) {
        return userEscrows[_user];
    }

    function getEscrowStatus(
        uint256 _escrowId
    ) external view escrowExists(_escrowId) returns (EscrowStatus) {
        return escrows[_escrowId].status;
    }

    function isEscrowActive(
        uint256 _escrowId
    ) external view escrowExists(_escrowId) returns (bool) {
        EscrowStatus status = escrows[_escrowId].status;
        return
            status == EscrowStatus.Funded ||
            status == EscrowStatus.InTransit ||
            status == EscrowStatus.Delivered;
    }

    function setOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Oracle address cannot be zero");
        address oldOracle = oracle;
        oracle = _newOracle;
        emit OracleUpdated(oldOracle, _newOracle);
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function resetEscrowCounter() external onlyOwner {
        escrowCounter = 0;
    }

    function clearUserEscrows(address _user) external onlyOwner {
        delete userEscrows[_user];
    }

    function clearAllUserEscrows() external onlyOwner {
    }

    function adminUpdateStatus(
        uint256 _escrowId,
        EscrowStatus _newStatus
    ) external escrowExists(_escrowId) {
        require(
            msg.sender == owner || msg.sender == oracle,
            "Only owner or oracle can call this function"
        );
        
        Escrow storage escrow = escrows[_escrowId];
        EscrowStatus oldStatus = escrow.status;
        
        if (_newStatus == EscrowStatus.Completed && oldStatus != EscrowStatus.Completed) {
            require(
                oldStatus != EscrowStatus.Refunded && oldStatus != EscrowStatus.Completed,
                "Cannot complete refunded or already completed escrow"
            );
            require(escrow.amount > 0, "Escrow amount must be greater than 0");
            require(
                address(this).balance >= escrow.amount,
                "Contract does not have enough balance"
            );
            
            uint256 amount = escrow.amount;
            address seller = escrow.seller;
            
            escrow.status = EscrowStatus.Completed;
            escrow.verified = true; // Mark as verified when admin completes it
            
            (bool success, ) = payable(seller).call{value: amount}("");
            require(success, "Transfer failed");
            
            emit FundsReleased(_escrowId, seller, amount);
        } else if (_newStatus == EscrowStatus.Refunded && oldStatus != EscrowStatus.Refunded) {
            require(
                oldStatus != EscrowStatus.Completed && oldStatus != EscrowStatus.Refunded,
                "Cannot refund completed or already refunded escrow"
            );
            require(escrow.amount > 0, "Escrow amount must be greater than 0");
            require(
                address(this).balance >= escrow.amount,
                "Contract does not have enough balance"
            );
            
            uint256 amount = escrow.amount;
            address buyer = escrow.buyer;
            
            escrow.status = EscrowStatus.Refunded;
            
            (bool success, ) = payable(buyer).call{value: amount}("");
            require(success, "Refund failed");
            
            emit EscrowRefunded(_escrowId, buyer, amount);
        } else {
            escrow.status = _newStatus;
        }
        
        emit StatusUpdated(_escrowId, uint8(oldStatus), uint8(_newStatus));
    }

    event StatusUpdated(
        uint256 indexed escrowId,
        uint8 oldStatus,
        uint8 newStatus
    );
}
