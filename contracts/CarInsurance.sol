pragma solidity 0.8.30;

contract CarInsurance {
    enum State { Created, Active, ClaimSubmitted, PaidOut, Rejected, Cancelled }

    struct Policy {
        address insurer;
        address client;
        address assessor;
        string carInfo;
        uint256 premium;
        uint256 maxCoverage;
        uint256 claimAmount;
        string reason;
        State state;
    }

    mapping(uint256 => Policy) private policies;
    uint256 public policyCount;
    bool private locked;

    address public authorizedInsurer;

    constructor() {
        authorizedInsurer = msg.sender;
    }

    modifier onlyAuthorizedInsurer() {
        require(msg.sender == authorizedInsurer, "Only authorized insurer");
        _;
    }

    event PolicyCreated(uint256 indexed policyId, address indexed insurer, address indexed client, address assessor, uint256 premium, uint256 maxCoverage);
    event PolicyBought(uint256 indexed policyId);
    event ClaimSubmitted(uint256 indexed policyId, uint256 claimAmount, string reason);
    event ClaimApproved(uint256 indexed policyId, uint256 clientPayment, uint256 insurerPayment);
    event ClaimRejected(uint256 indexed policyId, uint256 insurerPayment);
    event PolicyCancelledByInsurer(uint256 indexed policyId, uint256 insurerPayment);
    event PolicyCancelledByClient(uint256 indexed policyId, uint256 clientRefund, uint256 insurerPayment);

    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    modifier policyExists(uint256 policyId) {
        require(policyId > 0 && policyId <= policyCount, "Policy does not exist");
        _;
    }

    function createPolicy(
        address client,
        address assessor,
        string calldata carInfo,
        uint256 premium
    ) external payable nonReentrant onlyAuthorizedInsurer returns (uint256) {
        require(client != address(0) && assessor != address(0), "Zero address");
        require(msg.sender != client && msg.sender != assessor && client != assessor, "Participants must differ");
        require(bytes(carInfo).length > 0, "Car info is empty");
        require(premium > 0, "Premium must be positive");
        require(msg.value > premium, "Reserve must exceed premium");
        require(msg.value <= type(uint256).max - premium, "Total amount overflow");

        policyCount++;
        uint256 policyId = policyCount;

        policies[policyId] = Policy({
            insurer: msg.sender,
            client: client,
            assessor: assessor,
            carInfo: carInfo,
            premium: premium,
            maxCoverage: msg.value,
            claimAmount: 0,
            reason: "",
            state: State.Created
        });

        emit PolicyCreated(policyId, msg.sender, client, assessor, premium, msg.value);
        return policyId;
    }

    function getPolicy(uint256 policyId) external view policyExists(policyId) returns (Policy memory) {
        return policies[policyId];
    }

    function buyPolicy(uint256 policyId) external payable nonReentrant policyExists(policyId) {
        Policy storage p = policies[policyId];
        require(msg.sender == p.client, "Only client");
        require(p.state == State.Created, "Wrong state");
        require(msg.value == p.premium, "Wrong premium amount");

        p.state = State.Active;
        emit PolicyBought(policyId);
    }

    function submitClaim(uint256 policyId, uint256 claimAmount, string calldata reason)
        external nonReentrant policyExists(policyId)
    {
        Policy storage p = policies[policyId];
        require(msg.sender == p.client, "Only client");
        require(p.state == State.Active, "Wrong state");
        require(claimAmount > 0 && claimAmount <= p.maxCoverage, "Invalid claim amount");
        require(bytes(reason).length > 0, "Reason is empty");

        p.claimAmount = claimAmount;
        p.reason = reason;
        p.state = State.ClaimSubmitted;
        emit ClaimSubmitted(policyId, claimAmount, reason);
    }

    function approveClaim(uint256 policyId) external nonReentrant policyExists(policyId) {
        Policy storage p = policies[policyId];
        require(msg.sender == p.assessor, "Only assessor");
        require(p.state == State.ClaimSubmitted, "Wrong state");

        uint256 insurerPayment = p.maxCoverage - p.claimAmount + p.premium;
        p.state = State.PaidOut;

        sendEth(p.client, p.claimAmount);
        sendEth(p.insurer, insurerPayment);
        emit ClaimApproved(policyId, p.claimAmount, insurerPayment);
    }

    function rejectClaim(uint256 policyId) external nonReentrant policyExists(policyId) {
        Policy storage p = policies[policyId];
        require(msg.sender == p.assessor, "Only assessor");
        require(p.state == State.ClaimSubmitted, "Wrong state");

        uint256 insurerPayment = p.maxCoverage + p.premium;
        p.state = State.Rejected;
        sendEth(p.insurer, insurerPayment);
        emit ClaimRejected(policyId, insurerPayment);
    }

    function cancelByInsurer(uint256 policyId) external nonReentrant policyExists(policyId) {
        Policy storage p = policies[policyId];
        require(msg.sender == p.insurer, "Only insurer");
        require(p.state == State.Created, "Wrong state");

        p.state = State.Cancelled;
        sendEth(p.insurer, p.maxCoverage);
        emit PolicyCancelledByInsurer(policyId, p.maxCoverage);
    }

    function cancelByClient(uint256 policyId) external nonReentrant policyExists(policyId) {
        Policy storage p = policies[policyId];
        require(msg.sender == p.client, "Only client");
        require(p.state == State.Active, "Wrong state");

        uint256 clientRefund = (p.premium / 100) * 80 + ((p.premium % 100) * 80) / 100;
        uint256 insurerPayment = p.maxCoverage + p.premium - clientRefund;
        p.state = State.Cancelled;

        sendEth(p.client, clientRefund);
        sendEth(p.insurer, insurerPayment);
        emit PolicyCancelledByClient(policyId, clientRefund, insurerPayment);
    }

    function sendEth(address receiver, uint256 amount) private {
        if (amount == 0) return;
        (bool sent, ) = payable(receiver).call{value: amount}("");
        require(sent, "ETH transfer failed");
    }
}